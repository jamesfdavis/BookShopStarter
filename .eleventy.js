const Image = require("@11ty/eleventy-img");
const path = require("path");
const dateFilter = require("./src/filters/date-filter.js");
const w3DateFilter = require("./src/filters/w3-date-filter.js");
const readTimeFilter = require("./src/filters/read-time-filter.js");
const randomBlogsFilter = require("./src/filters/random-blogs-filter.js");
const uuidFilter = require("./src/filters/uuid-filter.js");
const linkFilter = require("./src/filters/active-link-filter.js");
const military_time = require("./src/filters/military-time-filter.js");
const id_filter = require("./src/filters/id-filter.js");
const log_filter = require("./src/filters/log-filter.js");
const fileSubstringFilter = require("./src/filters/extract-file-substring-filter.js");
const stringifyFilter = require("./src/filters/stringify-filter.js");
const evalLiquid = require("./src/filters/evalLiquid-filter.js");
const happeningsFilter = require("./src/filters/happenings-filter.js");
const getServiceCategories = require("./src/filters/getServiceCategories-filter.js");
const pathExistsFilter = require("./src/filters/pathExists-filter.js");
const rssPlugin = require("@11ty/eleventy-plugin-rss");
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it"),
  md = markdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });
md.disable(["code", "blockquote"]);
const markdownItAnchor = require("markdown-it-anchor");
const pluginTOC = require("eleventy-plugin-toc");
const pluginBookshop = require("@bookshop/eleventy-bookshop");
const yaml = require("js-yaml");
const { execSync } = require("child_process");
const fs = require("fs");
const svgContents = require("eleventy-plugin-svg-contents");

const imageShortcode = async (
  src,
  alt,
  cls = "",
  sizes = "100vw",
  preferSvg = true,
  widths = [200, 400, 850, 1280, 1600],
  formats = ["avif", "webp", "svg", "jpeg"],
) => {
  let before = Date.now();

  let inputFilePath = src == null ? src : path.join("src", src);

  if (src.includes("http://") || src.includes("https://")) {
    inputFilePath = src;
  }

  // console.log(
  //   `[11ty/eleventy-img] ${Date.now() - before}ms: ${inputFilePath}`,
  // );
  const imageMetadata = await Image(inputFilePath, {
    svgShortCircuit: preferSvg ? "size" : false,
    widths: [...widths],
    formats: [...formats, null],
    outputDir: "dist/assets/images",
    urlPath: "/assets/images",
  });

  const imageAttributes = {
    class: cls,
    alt,
    sizes: sizes || "100vw",
    loading: "lazy",
    decoding: "async",
  };

  return Image.generateHTML(imageMetadata, imageAttributes)
    .replace(/\s+/g, " ")
    .trim();
};

const logoShortcode = async (
  src,
  alt,
  cls = "",
  sizes = "100vw",
  preferSvg = true,
  widths = [200],
  formats = ["avif", "webp", "svg", "jpeg"],
) => {
  let before = Date.now();
  let inputFilePath = src == null ? src : path.join("src", src);
  if (fs.existsSync(inputFilePath)) {
    // console.log(
    //   `[11ty/eleventy-img] ${Date.now() - before}ms: ${inputFilePath}`,
    // );
    const imageMetadata = await Image(inputFilePath, {
      svgShortCircuit: preferSvg ? "size" : false,
      widths: [...widths],
      formats: [...formats, null],
      outputDir: "dist/assets/images",
      urlPath: "/assets/images",
    });

    const imageAttributes = {
      class: cls,
      alt,
      sizes: sizes || "100vw",
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(imageMetadata, imageAttributes);
  } else {
    return `<img class='${cls}' src='${src}' alt='${alt}'>`;
  }
};

function generateImages(src, widths = [200, 400, 850, 1920, 2500]) {
  let source = src;
  let options = {
    widths: [...widths, null],
    formats: ["jpeg", "webp", null],
    outputDir: "dist/assets/images",
    urlPath: "/assets/images",
    useCache: true,
    sharpJpegOptions: {
      quality: 80,
      progressive: true,
    },
  };
  // genrate images, ! dont wait
  Image(source, options);
  // get metadata even the image are not fully generated
  return Image.statsSync(source, options);
}

function imageCssBackground(src, selector, widths) {
  const metadata = generateImages(src, widths);
  let markup = [
    `${selector} { background-image: url(${metadata.jpeg[0].url});} `,
  ];
  // i use always jpeg for backgrounds
  metadata.webp.slice(1).forEach((image, idx) => {
    markup.push(
      `@media (min-width: ${metadata.jpeg[idx].width}px) { ${selector} {background-image: url(${image.url});}}`,
    );
  });
  return markup.join("");
}

// Load tokens from the tokens.yml file
function loadTokens() {
  const tokensFile = path.join(__dirname, "src", "_data", "tokens.yml");
  const tokens = yaml.load(fs.readFileSync(tokensFile, "utf8"));

  // Recursively flatten the tokens
  function flattenTokens(tokenList, prefix = "") {
    let flatTokens = {};

    tokenList.forEach((token) => {
      if (token.key && token.value) {
        // Add key-value pairs
        const fullKey = prefix ? `${prefix}.${token.key}` : token.key;
        flatTokens[fullKey] = token.value;
      } else if (token.groupName && token.tokens) {
        // Recurse into nested groups
        const groupPrefix = prefix ? `${prefix}.${token.groupName}` : token.groupName;
        Object.assign(flatTokens, flattenTokens(token.tokens, groupPrefix));
      }
    });

    
    return flatTokens;
  }

  return flattenTokens(tokens.token_list);
}

// Load and flatten allowed site.json fields
function loadSiteTokens() {
  const siteFile = path.join(__dirname, "src", "_data", "site.json");
  const siteData = JSON.parse(fs.readFileSync(siteFile, "utf8"));

  // Define the allowed fields and flatten them
  const allowedFields = ["name", "legalName", "url"];
  const contactFields = siteData.contactInfo || {};

  const flattenedTokens = {};

  // Include allowed top-level fields
  allowedFields.forEach((field) => {
    if (siteData[field]) {
      flattenedTokens[field] = siteData[field];
    }
  });

  // Include contactInfo fields with "contactInfo." prefix
  Object.keys(contactFields).forEach((key) => {
    flattenedTokens[`contactInfo.${key}`] = contactFields[key];
  });

  return flattenedTokens;
}

module.exports = (eleventyConfig) => {
  // Markdown
  let options = {
    html: true,
    linkify: true,
    typographer: true,
  };
  eleventyConfig.setLibrary(
    "md",
    markdownIt(options).disable(["code"]).use(markdownItAnchor),
  );
  eleventyConfig.addWatchTarget("./_component-library/**/*");

  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));
  eleventyConfig.addDataExtension("yml", (contents) => yaml.load(contents));

  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
  eleventyConfig.addPassthroughCopy("./src/images/");
  eleventyConfig.addPassthroughCopy("/src/images/");
  eleventyConfig.addPassthroughCopy("./src/assets/uploads/**");
  eleventyConfig.addPassthroughCopy("./src/assets/images");
  eleventyConfig.addPassthroughCopy("./src/_includes/partials/background");
  // eleventyConfig.addPassthroughCopy("./src/css/");
  eleventyConfig.addPassthroughCopy({ "./src/images/favicon": "/" });
  eleventyConfig.addPassthroughCopy("./src/fonts");
  //eleventyConfig.addPassthroughCopy({ './src/robots.txt': '/robots.txt' });
  eleventyConfig.addPassthroughCopy("./src/_redirects");
  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addAsyncShortcode("logo", logoShortcode);
  eleventyConfig.addShortcode("cssBackground", imageCssBackground);
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(pluginTOC, {
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"],
  });
  eleventyConfig.addPlugin(svgContents);

  eleventyConfig.addPlugin(
    pluginBookshop({
      bookshopLocations: ["_component-library"],
      pathPrefix: "",
    }),
  );

  // Returns a collection of blog posts in reverse date order
  eleventyConfig.addCollection("blog", (collection) => {
    return [...collection.getFilteredByGlob("./src/posts/**/*.md")].reverse();
  });

  eleventyConfig.addCollection("pages", (collection) => {
    return collection.getFilteredByGlob("./src/pages/**/*.md");
  });

  eleventyConfig.addCollection("services", (collection) => {
    return collection.getFilteredByGlob("./src/services/**/*.md");
  });
  eleventyConfig.addCollection("happenings", (collection) => {
    return collection.getFilteredByGlob("./src/happenings/**/*.md");
  });

  eleventyConfig.addCollection("upcomingHappenings", function (collectionsApi) {
    const happeningsConfig = yaml.load(
      fs.readFileSync("./src/_data/happenings.yml", "utf8"),
    );
    const tags = ["happenings"].concat(happeningsConfig.tags);
    return collectionsApi
      .getFilteredByGlob(["./src/happenings/**/*.md", "./src/posts/**/*.md"])
      .filter(function (item) {
        const today = new Date();
        return (
          ((item.data.draft === false && item.url.includes("happenings/")) ||
            (item.data.happeningDate !== null &&
              (item.data.happening === null || item.data.happening === true) &&
              (happeningsConfig.tags === null ||
                happeningsConfig.tags.some(
                  (tag) => item.data.tags && item.data.tags.includes(tag),
                )))) &&
          new Date(item.data.happeningDate) >= today
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.data.happeningDate);
        const dateB = new Date(b.data.happeningDate);
        return dateA - dateB;
      });
  });

  eleventyConfig.addCollection("pastHappenings", function (collectionsApi) {
    const happeningsConfig = yaml.load(
      fs.readFileSync("./src/_data/happenings.yml", "utf8"),
    );
    const tags = ["happenings"].concat(happeningsConfig.tags);
    return collectionsApi
      .getFilteredByGlob(["./src/happenings/**/*.md", "./src/posts/**/*.md"])
      .filter(function (item) {
        const today = new Date();
        return (
          ((item.data.draft === false && item.url.includes("happenings/")) ||
            (item.data.happeningDate !== null &&
              (item.data.happening === null || item.data.happening === true) &&
              (happeningsConfig.tags === null ||
                happeningsConfig.tags.some(
                  (tag) => item.data.tags && item.data.tags.includes(tag),
                )))) &&
          new Date(item.data.happeningDate) < today
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.data.happeningDate);
        const dateB = new Date(b.data.happeningDate);
        return dateB - dateA;
      });
  });

  eleventyConfig.addFilter("dateFilter", dateFilter);
  eleventyConfig.addFilter("w3DateFilter", w3DateFilter);
  eleventyConfig.addFilter("readTimeFilter", readTimeFilter);
  eleventyConfig.addFilter("randomBlogsFilter", randomBlogsFilter);
  eleventyConfig.addFilter("ymlify", (yml) => yaml.load(yml));
  eleventyConfig.addFilter("militaryTime", military_time);
  eleventyConfig.addFilter("markdownify", (markdown) => md.render(markdown));
  eleventyConfig.addFilter("uuidFilter", uuidFilter);
  eleventyConfig.addFilter("linkFilter", linkFilter);
  eleventyConfig.addFilter("idFilter", id_filter);
  eleventyConfig.addFilter("logFilter", log_filter);
  eleventyConfig.addFilter("categoriesFilter", getServiceCategories);
  eleventyConfig.addFilter("fileSubstringFilter", fileSubstringFilter);
  eleventyConfig.addFilter("stringifyFilter", stringifyFilter);
  eleventyConfig.addFilter("removeExtraWhitespace", function (str) {
    return str.replace(/\s+/g, " ").trim();
  });
  eleventyConfig.addFilter("evalLiquid", evalLiquid);
  eleventyConfig.addFilter("happeningsFilter", happeningsFilter);
  eleventyConfig.addFilter("pathExists", pathExistsFilter);

  // Load and flatten tokens
  const tokens = loadTokens();
  // Load and flatten tokens for st.* tokens
  const siteTokens = loadSiteTokens();
  eleventyConfig.addTransform("replace-tokens", function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      // Replace tokens in the content
      return content.replace(/\{\{tk\.([^\}]+)\}\}/g, (match, path) => {
        return tokens[path] || ""; // Replace if key exists, else leave the placeholder
      });
    }
    // If not an HTML output, return content as-is
    return content;
  });

  // Transform for st.* tokens
  eleventyConfig.addTransform("replace-site-tokens", function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      return content.replace(/\{\{st\.([^\}]+)\}\}/g, (match, path) => {
        return siteTokens[path] || ""; // Replace with value or empty string
      });
    }
    return content;
  });

  eleventyConfig.on("eleventy.before", () => {
    execSync("node ./utils/generateFavicon.js");
    execSync("node ./utils/syncPermalinks.js");
    execSync("node ./utils/permalinkDupCheck.js");
    execSync("node ./utils/addHappeningPagination.js");
    execSync("node ./utils/addBlogPagination.js");
    execSync("node ./utils/fetch-theme-variables.js");
  });

  eleventyConfig.on("eleventy.after", () => {
    execSync(
      "npx tailwindcss -i ./src/css/main.css -o ./dist/css/styles.css --minify",
    );
  });

  return {
    markdownTemplateEngine: "liquid",
    dataTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    cssTemplateEngine: "liquid",
    dir: {
      input: "src",
      pages: "pages",
      output: "dist",
    },
  };
};