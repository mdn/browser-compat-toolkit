/*

Migrated from https://github.com/mdn/kumascript/master/macros/CompatBeta.ejs

Run as render(data, configuration), where config gives rendering configuration.

Required configuration:

- query: The full querystring for the data, such as webextensions.api.alarms

Optional configuration:

- depth: How deep subfeatures should be added to the table
- strings: Replacements for the default strings, such as localized strings
- forMDNURL: The MDN URL that the table will be displayed on.
  If given, use relative links, but avoid linking to that page.
  If omitted (default), use external links to MDN.

Sample:

render(bcd.webextensions.api.alarms, {'query': 'webextensions.api.alarms'});
*/

// import * as defaultStrings from './english-strings'

const defaultStrings = require('./english-strings');
const nunjucks = require('nunjucks');

const browsers = {
  'desktop': ['chrome', 'edge', 'firefox', 'ie', 'opera', 'safari'],
  'mobile': ['webview_android', 'chrome_android', 'edge_mobile', 'firefox_android', 'opera_android', 'safari_ios', 'samsunginternet_android'],
  'server': ['nodejs'],
  'webextensions-desktop': ['chrome', 'edge', 'firefox', 'opera'],
  'webextensions-mobile': ['firefox_android']
};

/* The rendering function */
function render (compatData, configuration) {
  const query = configuration.query;
  const depth = configuration.depth || 1;
  const forMDNURL = configuration.forMDNURL;
  const category = query.split('.')[0];
  let legendItems = new Set(); // entries will be unique
  let output = '';
  let strings = defaultStrings;

  for (var key in configuration.strings) {
    strings[key] = configuration.strings[key];
  }

  let bcCategory = 'web';
  let platforms = ['desktop', 'mobile'];
  let displayBrowers = [...browsers['desktop'], ...browsers['mobile']];

  if (category === 'javascript') {
    bcCategory = 'js';
    displayBrowers.push(...browsers['server']);
    platforms.push('server');
  }
  if (category === 'webextensions') {
    bcCategory = 'ext';
    displayBrowers = [...browsers['webextensions-desktop'], ...browsers['webextensions-mobile']];
    platforms = ['webextensions-desktop', 'webextensions-mobile'];
  }

  /* Gather a flat list of features */
  let features = [];
  if (compatData.__compat) {
    let feature = compatData.__compat;
    feature.description = strings['feature_basicsupport'];
    const identifier = query.split('.').pop();
    features.push({[identifier]: feature});
  }
  traverseFeatures(compatData, depth, '', features);

  if (features.length > 0) {
    output = nunjucks.render('src/templates/table.html', {
      category: bcCategory,
      platforms: processPlatforms(strings, platforms),
      browsers: processBrowsers(strings, displayBrowers),
      features: processFeatures(strings, features, forMDNURL, displayBrowers, legendItems, bcCategory),
      legend: processLegend(strings, legendItems)
    });
  } else {
    let errString = strings['no_data_found'].replace('${query}', query).replace('${depth}', depth);
    output = errString;
  }

  return output;
}

/*
Get features that should be displayed according to the query and the depth setting
Flatten them into a features array
*/
function traverseFeatures (obj, depth, identifier, features) {
  depth--;
  if (depth >= 0) {
    for (let i in obj) {
      if (!!obj[i] && typeof (obj[i]) === 'object' && i !== '__compat') {
        if (obj[i].__compat) {
          features.push({[identifier + i]: obj[i].__compat});
        }
        traverseFeatures(obj[i], depth, i + '.', features);
      }
    }
  }
}

/*
 * Rendering functions!
 */
function processPlatforms (strings, platforms) {
  let output = [];
  for (let platform of platforms) {
    const id = platform.replace('webextensions-', '');
    output.push({
      id,
      count: Object.keys(browsers[platform]).length,
      icon: processIcon(strings, id)
    });
  }
  return output;
}

function processBrowsers (strings, displayBrowers) {
  let output = [];
  for (let browser of displayBrowers) {
    output.push({
      id: browser,
      icon: processIcon(strings, browser)
    });
  }
  return output;
}

function processFeatures (strings, features, forMDNURL, displayBrowers, legendItems, bcCategory) {
  let output = [];
  for (const row of features) {
    const feature = Object.keys(row).map((k) => row[k])[0];
    output.push({
      header: processFeatureHeader(strings, row, feature, forMDNURL, legendItems, bcCategory),
      support: processFeatureSupport(strings, feature.support, displayBrowers, legendItems)
    });
  }
  return output;
}

/**
 * Write icon with localized hover text
 *
 * @param {String[]} strings
 * @param {String} iconSlug
 * @param {String} [replacer]
 * @param {Boolean} [isLegend=false]
 *
 * @return {nm$_mdn-feature-table.processIcon.output}
 */
function processIcon (strings, iconSlug, replacer, isLegend = false) {
  /**
   * @type Object
   * @property {String} name The icon name
   * @property {String} id The icon ID
   * @property {String} title The icon title
   */
  let output = {
    name: stringOrKey(strings, 'bc_icon_name_' + iconSlug).replace('$1$', replacer),
    id: iconSlug,
    title: stringOrKey(strings, 'bc_icon_title_' + iconSlug).replace('$1$', replacer)
  };
  if (isLegend) {
    output.name = strings['legend_' + iconSlug];
    output.title = output.name;
  }
  // there is no iconTitle, fall back to iconName
  if (output.title === 'bc_icon_title_' + iconSlug) {
    output.title = output.name;
  }
  return output;
}

function processFeatureHeader (strings, row, feature, forMDNURL, legendItems, bcCategory) {
  let label = Object.keys(row)[0];
  let output = {
    name: ''
  };

  if (feature.description) {
    // Basic support or unnested features need no prefixing
    if (label.indexOf('.') === -1) {
      output.name = feature.description;
      // otherwise add a prefix so that we know where this belongs to (e.g. "parse: ISO 8601 format")
    } else {
      output.name = `<code>${label.slice(0, label.lastIndexOf('.'))}</code>: ${feature.description}`;
    }
  } else {
    output.name = `<code>${Object.keys(row)[0]}</code>`;
  }
  if (feature.mdn_url) {
    let href = feature.mdn_url;
    if (forMDNURL) {
      // Convert to relative MDN url
      href = feature.mdn_url.replace('https://developer.mozilla.org', '');
      let mdnSlug = forMDNURL.split('/docs/')[1];
      if (href.split('#')[0] === '/docs/' + mdnSlug) {
        // Don't link to the current page
        let anchor = '';
        if (feature.mdn_url.includes('#')) {
          anchor = feature.mdn_url.substring(feature.mdn_url.indexOf('#'));
        }
        href = anchor;
      }
    }
    if (href !== '') {
      output.href = href;
    }
  }

  if (feature.hasOwnProperty('status')) {
    let featureIcons;
    if (feature.status.experimental === true) {
      featureIcons = featureIcons || [];
      featureIcons.push(processIcon(strings, 'experimental'));
      legendItems.add('experimental');
    }
    if (feature.status.deprecated === true) {
      featureIcons = featureIcons || [];
      featureIcons.push(processIcon(strings, 'deprecated', strings['bc_icon_title_deprecated_' + (bcCategory === 'ext' ? 'ext' : 'web')]));
      legendItems.add('deprecated');
    }
    if (feature.status.standard_track === false) {
      featureIcons = featureIcons || [];
      featureIcons.push(processIcon(strings, 'non-standard'));
      legendItems.add('non-standard');
    }
    if (featureIcons) {
      output.icons = featureIcons;
    }
  }
  return output;
}

/* Use the key if no string is defined */
function stringOrKey (strings, key) {
  return strings[key] || key;
}

/*
Returns the string to appear in the table cell, like "Yes", "No" or "?", "Partial"
or the version number

`added` and `removed` are either null, true, false or a string containing a version number
`partial` is either null, true, or false indicating partial_implementation
*/
function getCellString (strings, added, removed, partial) {
  let output = {};
  switch (added) {
    case null:
      output.title = strings['supportsShort_unknown_title'];
      output.text = strings['supportsShort_unknown'];
      break;
    case true:
      output.class = 'bc-level-yes';
      output.title = strings['supportsLong_yes'];
      output.text = strings['supportsLong_yes'];
      output.added = strings['supportsShort_yes'];
      break;
    case false:
      output.class = 'bc-level-no';
      output.title = strings['supportsLong_no'];
      output.text = strings['supportsLong_no'];
      output.added = strings['supportsShort_no'];
      break;
    default:
      output.class = 'bc-level-yes';
      output.title = strings['supportsLong_yes'];
      output.text = strings['supportsLong_yes'];
      output.added = added;
      break;
  }
  if (removed) {
    output.class = 'bc-level-no';
    output.title = strings['supportsLong_no'];
    output.text = strings['supportsLong_no'];
    // We don't know when supported started
    if (typeof (added) === 'boolean' && added) {
      output.added = '?';
    }
    // We don't know when supported ended
    if (typeof (removed) === 'boolean' && removed) {
      output.removed = '?';
    } else { // We know when
      output.removed = removed;
    }
    // removed wins over partial
  } else if (partial) {
    output.class = 'bc-level-partial';
    output.title = strings['supportsLong_partial'];
    output.text = strings['supportsLong_partial'];
    // Display "Partial" instead of "Yes", "No", or "?" if we have no version string
    if (typeof (added) !== 'string') {
      output.added = strings['supportsShort_partial'];
    }
  }
  return output;
}

/*
Given the support information for a browser, this returns
a CSS class to apply to the table cell.

`supportData` is a (or an array of) support_statement(s)
*/
function getSupportClass (supportInfo) {
  let cssClass = 'unknown';

  if (Array.isArray(supportInfo)) {
    // the first entry should be the most relevant/recent and will be treated as "the truth"
    checkSupport(supportInfo[0].version_added,
      supportInfo[0].version_removed,
      supportInfo[0].partial_implementation);
  } else if (supportInfo) { // there is just one support statement
    checkSupport(supportInfo.version_added,
      supportInfo.version_removed,
      supportInfo.partial_implementation);
  } else { // this browser has no info, it's unknown
    return 'unknown';
  }

  function checkSupport (added, removed, partial) {
    if (added === null) {
      cssClass = 'unknown';
    } else if (added) {
      cssClass = 'yes';
      if (removed) {
        cssClass = 'no';
      }
    } else {
      cssClass = 'no';
    }
    if (partial && !removed) {
      cssClass = 'partial';
    }
  }

  return cssClass;
}

/**
 * Generate the note for a browser flag or preference
 * First checks version_added and version_removed to create a string indicating when
 * a preference setting is present. Then creates a (browser specific) string
 * for either a preference flag or a compile flag.
 *
 * @param {Object} strings contains localized strings
 * @param {Object} supportData is a support_statement
 * @param {Object} browserId is a compat_block browser ID
 *
 * @return {String} The note for the flags information.
 */
function processFlagsNote (strings, supportData, browserId) {
  // TODO: Should these be somewhere else?
  const firefoxPrefs = 'about:config';
  const chromePrefs = 'chrome://flags';

  let support = '';
  if (typeof (supportData.version_added) === 'string') {
    support = strings['flag_support_start'];
    support = support.replace('${versionAdded}', supportData.version_added);
  }

  if (typeof (supportData.version_removed) === 'string') {
    if (support) {
      support = strings['flag_support_range'];
      support = support.replace('${versionAdded}', supportData.version_added);
    } else {
      support = strings['flag_support_end'];
    }
    support = support.replace('${versionRemoved}', supportData.version_removed);
  }

  let start = strings['flag_start'];
  if (support) {
    start = strings['flag_start_cont'].replace('${support}', support);
  }

  let flagsText = '';
  let settings = '';

  for (let i = 0; i < supportData.flags.length; i++) {
    let flag = supportData.flags[i];
    let nameString = `<code>${flag.name}</code>`;

    // value_to_set is optional
    let valueToSet = '';
    if (flag.value_to_set) {
      valueToSet = strings['flag_valueToSet'].replace('${valueToSet}', flag.value_to_set);
    }

    let typeString = stringOrKey(strings, `flag_type_${flag.type}`).replace('${valueToSet}', valueToSet);
    if (flag.type === 'preference') {
      settings = strings['flag_browser'];
      switch (browserId) {
        case 'firefox':
        case 'firefox_android':
          settings = settings.replace('${browser}', stringOrKey(strings, `bc_icon_name_firefox`)).replace('${url}', firefoxPrefs);
          break;
        case 'chrome':
        case 'chrome_android':
          settings = settings.replace('${browser}', stringOrKey(strings, `bc_icon_name_chrome`)).replace('${url}', chromePrefs);
          break;
        default:
          settings = '';
          break;
      }
    }

    flagsText += nameString + typeString;

    if (i !== supportData.flags.length - 1) {
      flagsText += strings['flag_misc_joiner'];
    } else {
      flagsText += strings['flag_misc_end'];
    }
  }

  return (start + flagsText + settings);
}

/*
Generates icons for the main cell
`supportData` is a support_statement

*/
function processCellIcons (strings, support, legendItems) {
  let output = [];

  if (Array.isArray(support)) {
    // the first entry should be the most relevant/recent and will be used for the main cell
    support = support[0];
  }
  if (support.prefix) {
    output.push(processIcon(strings, 'prefix', support.prefix));
    legendItems.add('prefix');
  }

  if (support.notes) {
    output.push(processIcon(strings, 'footnote'));
    legendItems.add('footnote');
  }

  if (support.alternative_name) {
    output.push(processIcon(strings, 'altname', support.alternative_name));
    legendItems.add('altname');
  }

  if (support.flags) {
    output.push(processIcon(strings, 'disabled'));
    legendItems.add('disabled');
  }

  return output;
}

/*
Create notes section

`supportData` is a support_statement
`browserId` is a compat_block browser ID

*/
function processNotes (strings, support, browserId, legendItems) {
  let output = [];

  if (Array.isArray(support)) {
    for (let supportItem of support) {
      output.push(processSingleNote(strings, supportItem, browserId, legendItems));
    }
  } else {
    output.push(processSingleNote(strings, support, browserId, legendItems));
  }

  function processSingleNote (strings, support, browserId, legendItems) {
    let header = {
      class: getSupportClass(support),
      icons: processCellIcons(strings, support, legendItems),
      info: getCellString(strings,
        support.version_added,
        support.version_removed,
        support.partial_implementation)
    };
    let notes = [];

    if (support.prefix) {
      notes.push({
        icon: processIcon(strings, 'prefix', support.prefix),
        text: strings['bc_icon_title_prefix'].replace('$1$', support.prefix)
      });
    }

    if (support.notes) {
      if (Array.isArray(support.notes)) {
        for (let note of support.notes) {
          notes.push({
            icon: processIcon(strings, 'footnote'),
            text: note
          });
        }
      } else {
        notes.push({
          icon: processIcon(strings, 'footnote'),
          text: support.notes
        });
      }
    }

    if (support.alternative_name) {
      notes.push({
        icon: processIcon(strings, 'altname', support.alternative_name),
        text: strings['bc_icon_title_altname'].replace('$1$', support.alternative_name)
      });
    }

    if (support.flags) {
      notes.push({
        icon: processIcon(strings, 'disabled'),
        text: processFlagsNote(strings, support, browserId)
      });
    }

    let output = {
      header
    };
    if (notes.length > 0) {
      output.content = notes;
    }
    return output;
  };

  return output;
}

/*
For a single row, write all the cells that contain support data.
(That is, every cell in the row except the first, which contains
an identifier for the row,  like "Basic support".

*/
function processFeatureSupport (strings, supportData, displayBrowers, legendItems) {
  let output = [];

  for (let browserNameKey of displayBrowers) {
    let needsNotes = false;
    let support = supportData[browserNameKey];
    let supportInfo;
    if (support) {
      if (Array.isArray(support)) {
        // Take first support data
        supportInfo = getCellString(strings,
          support[0].version_added,
          support[0].version_removed,
          support[0].partial_implementation);
        needsNotes = true;
      } else {
        supportInfo = getCellString(strings,
          support.version_added,
          support.version_removed,
          support.partial_implementation);
        if (support.notes || support.prefix || support.flags || support.alternative_name) {
          needsNotes = true;
        }
      }
    } else { // browsers are optional in the data, display them as "?" in our table
      supportInfo = getCellString(strings, null);
    }

    let obj = {
      browser: {
        id: browserNameKey
      },
      class: getSupportClass(support),
      info: supportInfo,
      needsNotes: needsNotes
    };
    legendItems.add('support_' + obj.class);
    if (needsNotes) {
      obj.icons = processCellIcons(strings, support, legendItems);
      obj.notes = processNotes(strings, support, browserNameKey, legendItems);
    }
    output.push(obj);
  }

  return output;
}

function processLegend (strings, legendItems) {
  let sortOrder = ['support_yes', 'support_partial', 'support_no', 'support_unknown',
    'experimental', 'non-standard', 'deprecated',
    'footnote', 'disabled', 'altname', 'prefix'];
  let sortedLegendItems = Array.from(legendItems).sort(function (a, b) {
    return sortOrder.indexOf(a) - sortOrder.indexOf(b);
  });

  let items = [];
  for (let itemName of sortedLegendItems) {
    let item = {};
    if (itemName.startsWith('support_')) {
      // handle support cells
      let supportType = itemName.substring(itemName.indexOf('_') + 1);
      item.support = supportType;
      item.title = strings['supportsLong_' + supportType];
    } else {
      // handle icons
      item.icon = processIcon(strings, itemName, '', true);
      item.title = strings['legend_' + itemName];
    }
    items.push(item);
  }

  return {
    title: strings['legend'],
    items
  };
}

module.exports = render;
