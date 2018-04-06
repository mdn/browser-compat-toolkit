const fs = require("fs");
const handlebars = require("handlebars");

const englishStrings = require("./english-strings");

const templates = {
  table: fs.readFileSync("./src/renderers/templates/table.hbs", "utf-8"),
  header: fs.readFileSync("./src/renderers/templates/header.hbs", "utf-8"),
  legend: fs.readFileSync("./src/renderers/templates/legend.hbs", "utf-8"),
  body: fs.readFileSync("./src/renderers/templates/body.hbs", "utf-8"),
  tbody: fs.readFileSync("./src/renderers/templates/tbody.hbs", "utf-8")
};

const browsers = {
  desktop: ["chrome", "edge", "firefox", "ie", "opera", "safari"],
  mobile: [
    "webview_android",
    "chrome_android",
    "edge_mobile",
    "firefox_android",
    "opera_android",
    "safari_ios",
    "samsunginternet_android"
  ],
  server: ["nodejs"],
  "webextensions-desktop": ["chrome", "edge", "firefox", "opera"],
  "webextensions-mobile": ["firefox_android"]
};

const falseBody = {
  feature: [
    {
      mdn_url: "https://developer.mozilla.org/docs/Web/HTML/Element/blink",
      support: {
        webview_android: {
          version_added: false,
          cssClass: "red"
        },
        chrome: {
          version_added: false,
          cssClass: "red"
        },
        chrome_android: {
          version_added: false,
          cssClass: "red"
        },
        edge: {
          version_added: false,
          cssClass: "red"
        },
        edge_mobile: {
          version_added: false,
          cssClass: "red"
        },
        firefox: {
          version_added: "1",
          version_removed: "22",
          cssClass: "red"
        },
        firefox_android: {
          version_added: "4",
          version_removed: "22",
          cssClass: "red"
        },
        ie: {
          version_added: false,
          cssClass: "red"
        },
        opera: {
          version_added: "2",
          version_removed: "15",
          cssClass: "red"
        },
        opera_android: {
          version_added: "2",
          version_removed: "15",
          cssClass: "red"
        },
        safari: {
          version_added: false,
          cssClass: "red"
        },
        safari_ios: {
          version_added: false,
          cssClass: "red"
        }
      },
      status: {
        experimental: false,
        standard_track: false,
        deprecated: true
      },
      description: "Basic support"
    }
  ]
};

function getBcd(query) {
  /* Convert a string to the BCD data */
  let data = undefined;
  if (typeof query === "string" || query instanceof String) {
    const dataParts = query.split(".");
    data = require("mdn-browser-compat-data");
    dataParts.forEach(elem => {
      if (!data.hasOwnProperty(elem)) {
        throw new Error(`Unable to find data for "${query}" at "${elem}".`);
      }
      data = data[elem];
    });
  } else {
    data = query;
  }

  return data;
}
/* Use the key if no string is defined */
function stringOrKey(strings, key) {
  return strings[key] || key;
}

function tableContext(category, platforms, browsers) {
  return {
    category,
    header: headerContext(platforms, browsers),
    body: falseBody
  };
}

function headerContext(platforms, displayBrowsers) {
  let platformHeader = [];
  for (platform of platforms) {
    let count = Object.keys(browsers[platform]).length;
    let id = platform.replace("webextensions-", "");

    platformHeader.push({
      id,
      childLength: count,
      icon: writeIcon(englishStrings, id)
    });
  }

  let browserHeader = [];
  for (browser of displayBrowsers) {
    browserHeader.push({
      id: browser,
      icon: writeIcon(englishStrings, browser)
    });
  }

  return {
    browser: browserHeader,
    platform: platformHeader
  };

  /* Write a icon with localized hover text */
  function writeIcon(strings, id) {
    let iconName = stringOrKey(strings, "bc_icon_name_" + id);
    let iconTitle = stringOrKey(strings, "bc_icon_title_" + id);

    // there is no iconTitle, fall back to iconName
    if (iconTitle === "bc_icon_title_" + id) {
      iconTitle = iconName;
    }

    return {
      title: iconTitle,
      slug: id
    };
  }
}

function bodyContext(displayBrowsers) {
  for (browser of displayBrowsers) {
  }
}

function gatherFeatures(query, depth) {
  let features = [];
  bcdData = getBcd(query);
  // query is our starting path in the bcd dataset eg. webextensions.api.alarms
  if (bcdData.__compat) {
    let feature = bcdData.__compat;
    // TODO: make l10n compatible
    feature.description = englishStrings["feature_basicsupport"];
    const identifier = query.split(".").pop();

    features.push({ [identifier]: feature });
  }

  // TODO: make this algorithm human readable
  (function traverse(object, identifier) {
    depth--;
    if (depth >= 0) {
      for (let i in object) {
        if (!!object[i] && typeof object[i] === "object" && i !== "__compat") {
          if (object[i].__compat) {
            features.push({ [identifier + i]: object[i].__compat });
          }
          traverse(object[i], depth, i, +".", features);
        }
      }
    }
  })(bcdData, "");

  return features;
}

function render(configuration) {
  const category = configuration.query.split(".")[0];

  let cssClassCategory;
  let platforms = ["desktop", "mobile"];
  let displaybrowsers = [...browsers["desktop"], ...browsers["mobile"]];

  cssClassCategory = "web";

  if (category === "javascript") {
    cssClassCategory = "js";
    displaybrowsers.push(...browsers["server"]);
    platforms.push("server");
  } else if (category === "webextensions") {
    cssClassCategory = "ext";
    displaybrowsers = [
      ...browsers["webextensions-desktop"],
      ...browsers["webextensions-mobile"]
    ];
    platforms = ["webextensions-desktop", "webextensions-mobile"];
  }

  const template = handlebars.compile(templates.table);
  handlebars.registerPartial("header", templates.header);
  handlebars.registerPartial("tbody", templates.tbody);
  let html = template(tableContext(category, platforms, displaybrowsers));

  return html;
}

handlebars.registerHelper("needStatusIcons", function(status) {
    return status.experimental || status.standard_track || status.deprecated
})

handlebars.registerHelper("isString", function(obj, options) {
    if (typeof(obj) === "string") {
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
})

handlebars.registerHelper("isNotSupportedAnymore", function(obj, options) {
    if (typeof(obj.version_added) == "string" && typeof(obj.version_removed == "string")) {
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
})

handlebars.registerHelper("ifExists", function(obj) {
    return (obj !== undefined || obj !== null) 
})
//console.log(render({ query: "webextensions.api.alarms" }));
console.log(render({query: 'html.elements.blink'}));
//console.log(JSON.stringify(gatherFeatures('html.elements.blink', 1)))
