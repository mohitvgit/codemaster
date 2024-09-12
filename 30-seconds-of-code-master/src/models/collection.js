import Model from '#src/core/model.js';
import ContentModel from '#src/models/contentModel.js';
import CollectionSnippet from '#src/models/collectionSnippet.js';
import Snippet from '#src/models/snippet.js';
import Page from '#src/adapters/page.js';
import SublinkPresenter from '#src/presenters/sublinkPresenter.js';
import settings from '#src/config/settings.js';

export default class Collection extends ContentModel {
  static {
    Model.prepare(this, ['id']);
  }

  constructor(data) {
    super(data);
    this.id = data.id;
    this.title = data.title;
    this.shortTitle = data.shortTitle;
    this.miniTitle = data.miniTitle;
    this.content = data.content;
    this.description = data.description;
    this.listed = data.listed || false;
    this.cover = data.cover;
    this.tokens = data.tokens.split(';');
    this.ranking = data.ranking;
    this.featuredIndex = data.featuredIndex;
    this.topLevel = data.topLevel || false;
    this.parentId = data.parentId;
  }

  static primary(records) {
    return records.where({ topLevel: true });
  }

  static secondary(records) {
    return records.where({ parentId: p => p !== null });
  }

  static featured(records) {
    return records
      .where({ featuredIndex: x => x !== null })
      .order((a, b) => a.featuredIndex - b.featuredIndex);
  }

  get parent() {
    return Collection.find(this.parentId);
  }

  get children() {
    return Collection.where({
      parentId: this.id,
    });
  }

  get collectionSnippets() {
    return CollectionSnippet.scope('published', 'listed', 'byPosition').where({
      collectionId: this.id,
    });
  }

  get snippets() {
    return Snippet.where({
      id: this.collectionSnippets.pluck('snippetId'),
    });
  }

  get listedSnippets() {
    return this.collectionSnippets.map(cs => cs.snippet);
  }

  static get main() {
    return Collection.find(settings.collections.mainCollectionId);
  }

  static get collections() {
    return Collection.find(settings.collections.collectionsCollectionId);
  }

  get hasParent() {
    return Boolean(this.parent);
  }

  get isMain() {
    return this.id === settings.collections.mainCollectionId;
  }

  get isCollections() {
    return this.id === settings.collections.collectionsCollectionId;
  }

  get isPrimary() {
    return Boolean(this.topLevel);
  }

  get isSecondary() {
    return this.hasParent;
  }

  get rootUrl() {
    return this.hasParent ? this.parent.slug : this.slug;
  }

  get siblings() {
    return this.hasParent ? this.parent.children : [];
  }

  get siblingsExceptSelf() {
    return this.siblings.filter(sibling => sibling.id !== this.id);
  }

  get searchTokensArray() {
    return this.tokens;
  }

  get firstPageSlug() {
    return `${this.slug}/p/1`;
  }

  get allPageSlugs() {
    return Array.from(
      { length: this.pageCount },
      (_, i) => `${this.slug}/p/${i + 1}`
    );
  }

  get allPageFullUrls() {
    return this.allPageSlugs.map(slug => `${settings.website.url}${slug}`);
  }

  get pageCount() {
    return Math.ceil(
      this.listedSnippets.length / settings.presentation.cardsPerPage
    );
  }

  get formattedSnippetCount() {
    return `${this.listedSnippets.length} snippets`;
  }

  get sublinks() {
    return this.sublinkPresenter.sublinks;
  }

  // TODO: Fiddly, but some collections (e.g. promises) rely heavily on this
  matchesTag(tag) {
    return this.id.endsWith(`/${tag}`);
  }

  get pages() {
    if (this.isCollections) return this.collectionsPages;

    const pagination = {
      pageCount: this.pageCount,
      itemCount: this.listedSnippets.length,
      itemType: 'snippets',
    };

    return Array.from({ length: this.pageCount }, (_, i) => {
      const pageNumber = i + 1;
      return Page.from(this, {
        pageNumber,
        items: this.listedSnippets.slice(
          i * settings.presentation.cardsPerPage,
          (i + 1) * settings.presentation.cardsPerPage
        ),
        ...pagination,
        largeImages: false,
      });
    });
  }

  get collectionsPages() {
    if (!this.isCollections) return [];

    const featuredCollections = Collection.scope('featured');

    const pageCount = Math.ceil(
      featuredCollections.length / settings.presentation.collectionCardsPerPage
    );

    const pagination = {
      pageCount,
      itemCount: featuredCollections.length,
      itemType: 'collections',
    };

    return Array.from({ length: pageCount }, (_, i) => {
      const pageNumber = i + 1;
      return Page.from(this, {
        pageNumber,
        items: featuredCollections.slice(
          i * settings.presentation.collectionCardsPerPage,
          (i + 1) * settings.presentation.collectionCardsPerPage
        ),
        ...pagination,
        largeImages: true,
      });
    });
  }

  get sublinkPresenter() {
    return new SublinkPresenter(this);
  }
}
