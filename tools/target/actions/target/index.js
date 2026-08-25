const IMS_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
const MC_BASE = 'https://mc.adobe.io';

async function getToken(clientId, clientSecret) {
  const resp = await fetch(IMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid,AdobeID,read_organizations,additional_info.projectedProductContext,target_sdk',
    }),
  });
  const { access_token: accessToken } = await resp.json();
  return accessToken;
}

function targetRequest(method, path, tenant, clientId, token, body, version = 'v1') {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Api-Key': clientId,
      Accept: `application/vnd.adobe.target.${version}+json`,
      'Content-Type': body ? `application/vnd.adobe.target.${version}+json` : 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${MC_BASE}/${tenant}/target${path}`, opts).then((r) => r.json());
}

async function main(params) {
  if (params.__ow_method === 'OPTIONS') {
    return { statusCode: 204 };
  }

  const clientId = params.TARGET_CLIENT_ID;
  const clientSecret = params.TARGET_CLIENT_SECRET;
  const tenant = params.TARGET_TENANT;

  if (!clientId || !clientSecret || !tenant) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing TARGET_CLIENT_ID, TARGET_CLIENT_SECRET, or TARGET_TENANT params' }),
    };
  }

  const resource = params.resource || 'activities';
  const activityId = params.id || null;
  const activityType = params.type || null;
  const offerId = params.offerId ? Number(params.offerId) : null;

  try {
    const token = await getToken(clientId, clientSecret);
    let data;

    if (resource === 'offers') {
      data = await targetRequest('GET', '/offers?sortBy=name&limit=100', tenant, clientId, token);

    } else if (resource === 'audiences') {
      data = await targetRequest('GET', '/audiences?limit=100', tenant, clientId, token);

    } else if (resource === 'audience' && params.id) {
      data = await targetRequest('GET', `/audiences/${params.id}`, tenant, clientId, token);

    } else if (resource === 'activity' && params.id && activityType) {
      data = await targetRequest('GET', `/activities/${activityType}/${params.id}`, tenant, clientId, token, undefined, params.version || 'v1');

    } else if (resource === 'create-audience') {
      // Simple audience: match a URL/mbox query parameter equal to a value.
      // Params: name (required), param (required), value (required), description (optional).
      const { name, param, value, description } = params;
      if (!name || !param || value === undefined || value === '') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'create-audience requires name, param, and value' }),
        };
      }

      // Simple query-parameter audience: match when the page query string
      // contains "param=value" (same rule shape Target uses for URL audiences).
      const audienceDef = {
        name,
        description: description || 'Created via Personalize app',
        targetRule: { page: 'query', containsIgnoreCase: [`${param}=${value}`] },
      };

      data = await targetRequest('POST', '/audiences', tenant, clientId, token, audienceDef);

    } else if (resource === 'create-activity') {
      // Multi-experience XT activity: one experience per audience/offer pair.
      // params: name, mbox (optional), experiences = JSON array of {audienceId, offerId}.
      let pairs;
      try {
        pairs = JSON.parse(params.experiences || '[]');
      } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'experiences must be valid JSON' }) };
      }
      const mboxName = params.mbox || 'target-global-mbox';
      if (!params.name || !Array.isArray(pairs) || pairs.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'create-activity requires name and a non-empty experiences array' }),
        };
      }

      const experiences = pairs.map((p, i) => ({
        experienceLocalId: i,
        name: `Experience ${i + 1}`,
        audienceIds: [Number(p.audienceId)],
        offerLocations: [{ locationLocalId: 0, offerId: Number(p.offerId) }],
      }));

      const activityBody = {
        name: params.name,
        state: 'approved',
        priority: 0,
        locations: {
          mboxes: [{ locationLocalId: 0, name: mboxName }],
        },
        experiences,
        metrics: [{ metricLocalId: 32767, name: 'Conversion', conversion: true }],
      };

      data = await targetRequest('POST', '/activities/xt', tenant, clientId, token, activityBody);

    } else if (resource === 'create-xt') {
      // body arrives as a JSON string in params.__ow_body for POST, or as parsed params for GET
      let activityDef;
      if (params.__ow_body) {
        activityDef = JSON.parse(
          Buffer.isBuffer(params.__ow_body)
            ? params.__ow_body.toString()
            : params.__ow_body,
        );
      } else {
        // Passed as flat query params — reconstruct minimal definition
        activityDef = {
          name: params.name,
          mbox: params.mbox || 'target-global-mbox',
          offerId: Number(params.offerId),
          audienceId: params.audienceId ? Number(params.audienceId) : null,
        };
      }

      const { name, mbox = 'target-global-mbox', offerId: oId, audienceId } = activityDef;

      const experience = {
        experienceLocalId: 0,
        name: 'Experience A',
        offerLocations: [{ locationLocalId: 0, offerId: Number(oId) }],
      };
      if (audienceId) experience.audienceIds = [audienceId];

      const xtBody = {
        name,
        state: 'approved',
        priority: 0,
        locations: {
          mboxes: [{ locationLocalId: 0, name: mbox }],
        },
        experiences: [experience],
        metrics: [{ metricLocalId: 32767, name: 'Conversion', conversion: true }],
      };

      data = await targetRequest('POST', '/activities/xt', tenant, clientId, token, xtBody);

    } else if (resource === 'update-mbox' && activityId && activityType && params.mbox) {
      const version = params.version || 'v1';
      const activity = await targetRequest('GET', `/activities/${activityType}/${activityId}`, tenant, clientId, token, undefined, version);

      if (activity.httpStatus >= 400) {
        return {
          statusCode: activity.httpStatus,
          body: JSON.stringify({ raw: activity, vecActivity: true }),
        };
      }

      if (activity.locations?.mboxes) {
        activity.locations.mboxes.forEach((loc) => { loc.name = params.mbox; });
      }

      data = await targetRequest('PUT', `/activities/${activityType}/${activityId}`, tenant, clientId, token, activity, version);

    } else if (resource === 'update-offer' && activityId && activityType && offerId) {
      const activity = await targetRequest('GET', `/activities/${activityType}/${activityId}`, tenant, clientId, token);

      if (activity.httpStatus >= 400) {
        return {
          statusCode: activity.httpStatus,
          body: JSON.stringify({ raw: activity, vecActivity: true }),
        };
      }

      if (activity.experiences) {
        activity.experiences.forEach((exp) => {
          if (exp.offerLocations) {
            exp.offerLocations.forEach((loc) => { loc.offerId = offerId; });
          }
        });
      }

      data = await targetRequest('PUT', `/activities/${activityType}/${activityId}`, tenant, clientId, token, activity);

    } else {
      data = await targetRequest('GET', '/activities', tenant, clientId, token);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

exports.main = main;
