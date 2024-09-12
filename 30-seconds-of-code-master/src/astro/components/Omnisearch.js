import { quickParseTokens as tokenize } from '#src/lib/search/search.js';

const omnisearch = {
  openTrigger: document.querySelector('[data-open-modal="omnisearch"]'),
  dialog: document.querySelector('[data-modal="omnisearch"]'),
  closeTrigger: document.querySelector('[data-close-modal="omnisearch"]'),
  searchIcon: document.querySelector('search > svg.icon'),
  searchBox: document.querySelector('#omnisearch'),
  resultsSection: document.querySelector('output[for="omnisearch"]'),
  searchIndex: {},
  searchIndexInitialized: false,
  isOpen: false,
  prepare() {
    if (!this.searchIndexInitialized)
      fetch('/search-data.json')
        .then(data => data.json())
        .then(json => {
          this.searchIndex = json.searchIndex;
          this.searchIndexInitialized = true;
        });
  },
  open() {
    this.prepare();
    this.initializeSearchIconAnimation();
    this.dialog.showModal();
    this.isOpen = true;
    // Apply a padding in the place of the scrollbar to avoid content jumping.
    // Note that this must come before the scroll lock, otherwise the scrollbar
    // width will be 0.
    document.body.style.paddingInlineEnd = `${this.calculateScrollbarWidth()}px`;
    document.body.dataset.scrollLock = 'true';
  },
  close() {
    this.initializeCloseAnimation();
    this.playCloseAnimation();
    // Note that the animation duration is 185ms, so we wait 190ms before
    // closing the dialog to avoid the user seeing the dialog flashing before
    // it's closed.
    window.setTimeout(() => {
      this.dialog.close();
      this.isOpen = false;
      document.body.style.paddingInlineEnd = '';
      document.body.dataset.scrollLock = 'false';
    }, 185);
  },
  search(query) {
    if (!this.searchIndexInitialized || !this.isOpen) return;
    this.playSearchIconAnimation();
    const results = this.searchByKeyphrase(query);
    if (results.length > 0) this.displayResults(results);
    else if (query.length <= 1) this.displayEmptyState();
    else this.displayNotFoundState(query);
  },
  searchByKeyphrase(keyphrase) {
    let q = keyphrase.toLowerCase().trim();
    if (q.length <= 1) return [];
    let results = [];
    if (q.length) {
      let t = tokenize(q);
      if (t.length && this.searchIndex && this.searchIndex.length) {
        results = this.searchIndex
          .map(snippet => {
            snippet.score =
              t.reduce(
                (acc, tkn) =>
                  snippet.searchTokens.indexOf(tkn) !== -1 ? acc + 1 : acc,
                0
              ) / t.length;
            return snippet;
          })
          .filter(snippet => snippet.score > 0.3)
          .sort((a, b) => b.score - a.score);
      }
    }
    results = results.reduce(
      (acc, result) => {
        if (result.type === 'collection') acc.collections.push(result);
        else acc.snippets.push(result);
        return acc;
      },
      { collections: [], snippets: [], length: results.length }
    );
    // Limit to 5 collections and 100 snippets
    results.collections = results.collections.slice(0, 5);
    results.snippets = results.snippets.slice(0, 100);
    return results;
  },
  displayResults(results) {
    const { snippets, collections } = results;

    this.resultsSection.innerHTML = `
      ${
        collections.length
          ? this.createResultsHTML('Collections', collections)
          : ''
      }
      ${snippets.length ? this.createResultsHTML('Snippets', snippets) : ''}
    `;
  },
  displayEmptyState() {
    this.resultsSection.innerHTML = this.createEmptyStateHTML();
  },
  displayNotFoundState(query) {
    this.resultsSection.innerHTML = this.createNotFoundStateHTML(query);
  },
  createResultsHTML(title, results) {
    return `
      <h2>${title}</h2>
      <ul>${results.map(this.createResultHTML).join('')}</ul>
    `;
  },
  createResultHTML(result) {
    return `
      <li>
        <a href=${result.url}>
          ${result.title}
          <small>${result.tag}</small>
        </a>
      </li>
      `;
  },
  createEmptyStateHTML() {
    return `<p>Start typing a keyphrase to see matching snippets.</p>`;
  },
  createNotFoundStateHTML(query) {
    const escapedQuery = query
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    return `<p>
      We couldn't find any results for the keyphrase <strong>${escapedQuery}</strong>.
    </p>`;
  },
  calculateScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  },
  initializeSearchIconAnimation() {
    this.searchIconAnimation = this.searchIcon.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.1)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: 750,
        delay: 250,
        easing: 'ease',
      }
    );
    this.searchIconAnimation.pause();
  },
  playSearchIconAnimation() {
    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      this.searchIconAnimation.play();
    }
  },
  initializeCloseAnimation() {
    this.closeAnimation = this.dialog.animate(
      [
        { opacity: '1', transform: 'translateY(0)' },
        { opacity: '0', transform: 'translateY(-20px)' },
      ],
      {
        duration: 200,
        easing: 'ease-in',
      }
    );
    this.closeAnimation.pause();
  },
  playCloseAnimation() {
    if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      this.closeAnimation.play();
    }
  },
};

omnisearch.openTrigger.addEventListener('click', () => {
  omnisearch.open();
});

omnisearch.closeTrigger.addEventListener('click', () => {
  omnisearch.close();
});

omnisearch.dialog.addEventListener('keydown', e => {
  if (e.key === 'Escape' && omnisearch.isOpen) omnisearch.close();
});

omnisearch.dialog.addEventListener('click', e => {
  if (!e.target.closest('search')) omnisearch.close();
});

omnisearch.searchBox.addEventListener('keyup', e => {
  omnisearch.search(e.target.value);
});
