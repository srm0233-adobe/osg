import { loadScript } from '../../scripts/aem.js';

// Input:
// https://engage-ab.marketo.com/?munchkinId=407-SHS-468#/ds/mktform/1005

// Output:
// <script src="//407-SHS-468.mktoweb.com/js/forms2/js/forms2.min.js"></script>
// <form id="mktoForm_1005"></form>
// <script>MktoForms2.loadForm("//407-SHS-468.mktoweb.com", "407-SHS-468", 1005);</script>

function getFormProps(href) {
  try {
    const { searchParams, hash } = new URL(href);
    const munchkinId = searchParams.get('munchkinId');
    return {
      munchkinId,
      formId: hash.split('/')[3],
      baseUrl: `//${munchkinId}.mktoweb.com`,
      baseFormSrc: `//${munchkinId}.mktoweb.com/js/forms2/js/forms2.min.js`,
    };
  } catch (e) {
    throw Error(e);
  }
}

export default async function decorate(block) {
  const href = block.innerText.trim();
  if (!href) return;

  try {
    const {
      munchkinId, formId, baseUrl, baseFormSrc,
    } = getFormProps(href);

    await loadScript(baseFormSrc);
    block.innerHTML = '';
    if (!window.MktoForms2) return;

    const form = document.createElement('form');
    form.id = `mktoForm_${formId}`;
    block.append(form);
    window.MktoForms2.loadForm(baseUrl, munchkinId, formId);
  } catch (e) {
    throw Error(e);
  }
}
