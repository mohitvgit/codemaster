import { snippetPrefix } from '#src/lib/contentUtils/config.js';
import FileHandler from '#src/lib/contentUtils/fileHandler.js';
import MarkdownParser from '#src/lib/contentUtils/markdownParser/markdownParser.js';
import tokenize from '#src/lib/search/search.js';
import Ranker from '#src/lib/contentUtils/ranker.js';
import TocReader from '#src/lib/contentUtils/tocReader.js';
import StringUtils from '#src/lib/stringUtils.js';

export const extractSnippetData = async (snippetGlob, languageData) => {
  const snipppetData = await FileHandler.read(snippetGlob);

  return await Promise.all(
    snipppetData.map(async snippet => {
      const {
        filePath,
        title,
        shortTitle = title,
        tags,
        language: languageKey,
        body: fullText,
        excerpt: shortDescription,
        cover,
        dateModified,
        listed,
        tocEnabled = true,
      } = snippet;

      const language = languageData.get(languageKey);
      const id = filePath.replace(snippetPrefix, '').slice(0, -3);

      const [descriptionHtml, fullDescriptionHtml] = await Promise.all([
        MarkdownParser.parse(shortDescription, language?.short),
        MarkdownParser.parse(fullText, language?.short),
      ]);

      const tokens = tokenize(
        StringUtils.stripMarkdown(`${shortDescription} ${title}`)
      );
      const ranking = Ranker.rankIndexableContent(
        [title, ...tags, language?.long, fullText, shortDescription]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      );
      const tableOfContentsHtml = tocEnabled
        ? TocReader.readToC(fullDescriptionHtml) || ''
        : '';

      return {
        id,
        title,
        tags: tags.join(';').toLowerCase(),
        shortTitle,
        dateModified,
        listed,
        descriptionHtml,
        fullDescriptionHtml,
        tableOfContentsHtml,
        cover,
        languageKey,
        tokens: tokens.join(';'),
        ranking,
      };
    })
  );
};

export const exportSnippetData = snippetData => {
  /* eslint-disable camelcase */
  return snippetData.map(snippet => {
    return {
      model: 'Snippet',
      id: snippet.id,
      title: snippet.title,
      tags: snippet.tags,
      shortTitle: snippet.shortTitle,
      dateModified: snippet.dateModified,
      listed: snippet.listed,
      description: snippet.descriptionHtml,
      content: snippet.fullDescriptionHtml,
      tableOfContents: snippet.tableOfContentsHtml,
      cover: snippet.cover,
      languageId: snippet.languageKey,
      tokens: snippet.tokens,
      ranking: snippet.ranking,
    };
  });
  /* eslint-enable camelcase */
};
