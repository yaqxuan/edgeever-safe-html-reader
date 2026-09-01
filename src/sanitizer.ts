import createDOMPurify from "dompurify";
import { marked } from "marked";

export const SAFE_HTML_TAGS = [
  "a",
  "abbr",
  "blockquote",
  "br",
  "code",
  "del",
  "details",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
] as const;

const CANDIDATE_ATTRIBUTES = ["alt", "height", "href", "open", "src", "start", "title", "value", "width"];

const ALLOWED_ATTRIBUTES_BY_TAG: Readonly<Record<string, ReadonlySet<string>>> = {
  a: new Set(["href"]),
  abbr: new Set(["title"]),
  details: new Set(["open"]),
  img: new Set(["alt", "height", "src", "width"]),
  li: new Set(["value"]),
  ol: new Set(["start"]),
};

const URL_BASE = "https://edgeever.invalid/";
const DATA_IMAGE_PATTERN = /^data:image\/(?:avif|gif|jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i;

const isSafeLink = (value: string) => {
  try {
    const url = new URL(value, URL_BASE);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const isSafeImage = (value: string) => {
  if (DATA_IMAGE_PATTERN.test(value)) return true;
  try {
    const url = new URL(value, URL_BASE);
    return ["http:", "https:", "blob:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const enforcePerTagAttributes = (fragment: DocumentFragment) => {
  for (const element of fragment.querySelectorAll("*")) {
    const tag = element.tagName.toLocaleLowerCase();
    const allowed = ALLOWED_ATTRIBUTES_BY_TAG[tag] ?? new Set<string>();
    for (const attribute of [...element.attributes]) {
      if (!allowed.has(attribute.name.toLocaleLowerCase())) element.removeAttribute(attribute.name);
    }

    if (element instanceof HTMLAnchorElement) {
      const href = element.getAttribute("href");
      if (!href || !isSafeLink(href)) {
        element.removeAttribute("href");
      } else if (!href.startsWith("#")) {
        element.target = "_blank";
        element.rel = "noopener noreferrer";
      }
    }

    if (element instanceof HTMLImageElement) {
      const src = element.getAttribute("src");
      if (!src || !isSafeImage(src)) element.removeAttribute("src");
      element.loading = "lazy";
      element.decoding = "async";
      element.referrerPolicy = "no-referrer";
    }
  }
};

export const markdownToSafeFragment = async (markdown: string): Promise<DocumentFragment> => {
  const dirtyHtml = await marked.parse(markdown, {
    async: false,
    breaks: false,
    gfm: true,
  });
  const purifier = createDOMPurify(window);
  const sanitized = purifier.sanitize(String(dirtyHtml), {
    ALLOWED_TAGS: [...SAFE_HTML_TAGS],
    ALLOWED_ATTR: CANDIDATE_ATTRIBUTES,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_ATTR: ["srcdoc", "style"],
    FORBID_TAGS: ["embed", "iframe", "object", "script", "style"],
    RETURN_DOM_FRAGMENT: true,
  }) as unknown as DocumentFragment;

  enforcePerTagAttributes(sanitized);
  return sanitized;
};
