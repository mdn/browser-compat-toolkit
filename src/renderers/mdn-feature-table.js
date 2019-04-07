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

const defaultStrings = require('./english-strings')
const viperHTML = require('viperhtml')

const browsers = {
  'desktop': ['chrome', 'edge', 'firefox', 'ie', 'opera', 'safari'],
  'mobile': ['webview_android', 'chrome_android', 'edge_mobile', 'firefox_android', 'opera_android', 'safari_ios', 'samsunginternet_android'],
  'server': ['nodejs'],
  'webextensions-desktop': ['chrome', 'edge', 'firefox', 'opera'],
  'webextensions-mobile': ['firefox_android']
}

/* The rendering function */
function render (compatData, configuration = {}) {
  const query = configuration.query
  const depth = configuration.depth || 1
  const forMDNURL = configuration.forMDNURL
  const category = query ? query.split('.')[0] : undefined
  let legendItems = new Set() // entries will be unique
  let output = ''
  let strings = defaultStrings

  for (var key in configuration.strings) {
    strings[key] = configuration.strings[key]
  }

  let bcCategory = 'web'
  let platforms = ['desktop', 'mobile']
  let displayBrowers = [...browsers['desktop'], ...browsers['mobile']]

  if (category === 'javascript') {
    bcCategory = 'js'
    displayBrowers.push(...browsers['server'])
    platforms.push('server')
  }
  if (category === 'webextensions') {
    bcCategory = 'ext'
    displayBrowers = [...browsers['webextensions-desktop'], ...browsers['webextensions-mobile']]
    platforms = ['webextensions-desktop', 'webextensions-mobile']
  }

  /* Gather a flat list of features */
  const features = []
  if (compatData && compatData.__compat) {
    let feature = compatData.__compat
    feature.description = strings['feature_basicsupport']
    const identifier = query.split('.').pop()
    features.push({[identifier]: feature})
  }
  traverseFeatures(compatData, depth, '', features)

  if (features.length > 0) {
    output = String(viperHTML`
<div class="bc-data hidden">
  <table class="${`bc-table bc-table-${bcCategory}`}">
    ${writeCompatHead(strings, platforms, displayBrowers)}
    ${writeCompatBody(strings, features, forMDNURL, displayBrowers, legendItems, bcCategory)}
  </table>
  ${{html: writeLegend(strings, legendItems)}}
</div>`)
  } else {
    let errString = strings['no_data_found'].replace('${query}', query).replace('${depth}', depth)
    output = errString
  }

  return output
}

/*
Get features that should be displayed according to the query and the depth setting
Flatten them into a features array
*/
function traverseFeatures (obj, depth, identifier, features) {
  if (!obj) return
  depth--
  if (depth >= 0) {
    for (let i in obj) {
      if (!!obj[i] && typeof (obj[i]) === 'object' && i !== '__compat') {
        if (obj[i].__compat) {
          features.push({[identifier + i]: obj[i].__compat})
        }
        traverseFeatures(obj[i], depth, i + '.', features)
      }
    }
  }
}

/*
 * Rendering functions!
 */
function writeCompatHead (strings, platforms, displayBrowers) {
  return viperHTML`
<thead>
  ${writeCompatPlatformsRow(strings, platforms)}
  ${writeCompatBrowsersRow(strings, displayBrowers)}
</thead>`
}

function writeCompatPlatformsRow (strings, platforms) {
  return viperHTML`
<tr class="bc-platforms">
  <td/>${platforms.map(platform => {
    let platformCount = Object.keys(browsers[platform]).length
    let platformId = platform.replace('webextensions-', '')
    return viperHTML(platform)`
  <th colspan="${platformCount}" class="${`bc-platform-${platformId}`}">
    ${writeIcon(strings, platformId)}
  </th>`
  })}
</tr>`
}

function writeCompatBrowsersRow (strings, displayBrowers) {
  return viperHTML`
<tr class="bc-browsers">
  <td/>${displayBrowers.map(browser => viperHTML(browser)`
  <th class="${`bc-browser-${browser}`}">
    ${writeIcon(strings, browser)}
  </th>`)}
</tr>`
}

function writeCompatBody (strings, features, forMDNURL, displayBrowers, legendItems, bcCategory) {
  return viperHTML`
<tbody>
  ${writeCompatFeatureRow(strings, features, forMDNURL, displayBrowers, legendItems, bcCategory)}
</tbody>`
}

function writeCompatFeatureRow (strings, features, forMDNURL, displayBrowers, legendItems, bcCategory) {
  return features.map(row => {
    let feature = Object.keys(row).map((k) => row[k])[0]
    return viperHTML`
<tr>
  <th scope="row">${writeFeatureName(strings, row, feature, forMDNURL, legendItems, bcCategory)}</th>
  ${writeCompatCells(strings, feature.support, displayBrowers, legendItems)}
</tr>`
  })
}

/* Write a icon with localized hover text */
function writeIcon (strings, iconSlug, replacer, isLegend) {
  let iconName = stringOrKey(strings, 'bc_icon_name_' + iconSlug).replace('$1$', replacer)
  let iconTitle = stringOrKey(strings, 'bc_icon_title_' + iconSlug).replace('$1$', replacer)
  if (isLegend) {
    iconName = strings['legend_' + iconSlug]
    iconTitle = iconName
  }
  // there is no iconTitle, fall back to iconName
  if (iconTitle === 'bc_icon_title_' + iconSlug) {
    iconTitle = iconName
  }
  return viperHTML(iconName)`\
<abbr class="only-icon" title="${iconTitle}">\
<span>${iconName}</span>\
<i aria-hidden="true" class="${'ic-' + iconSlug}"/>\
</abbr>`
}

function writeFeatureName (strings, row, feature, forMDNURL, legendItems, bcCategory) {
  let desc
  let featureIcons
  let experimentalIcon
  let deprecatedIcon
  let nonStandardIcon
  let label = Object.keys(row)[0]

  if (feature.description) {
    // Basic support or unnested features need no prefixing
    if (label.indexOf('.') === -1) {
      desc = viperHTML`${{html: feature.description}}`
      // otherwise add a prefix so that we know where this belongs to (e.g. "parse: ISO 8601 format")
    } else {
      desc = viperHTML`<code>${label.slice(0, label.lastIndexOf('.'))}</code>: ${{html: feature.description}}`
    }
  } else {
    desc = viperHTML`<code>${Object.keys(row)[0]}</code>`
  }
  if (feature.mdn_url) {
    let href = feature.mdn_url
    if (forMDNURL) {
      // Convert to relative MDN url
      href = feature.mdn_url.replace('https://developer.mozilla.org', '')
      let mdnSlug = forMDNURL.split('/docs/')[1]
      if (href.split('#')[0] === '/docs/' + mdnSlug) {
        // Don't link to the current page
        let anchor = ''
        if (feature.mdn_url.includes('#')) {
          anchor = feature.mdn_url.substring(feature.mdn_url.indexOf('#'))
        }
        href = anchor
      }
    }
    if (href !== '') {
      desc = viperHTML`<a href="${href}">${desc}</a>`
    }
  }

  if (feature.hasOwnProperty('status')) {
    if (feature.status.experimental === true) {
      experimentalIcon = writeIcon(strings, 'experimental')
      legendItems.add('experimental')
    }
    if (feature.status.deprecated === true) {
      deprecatedIcon = writeIcon(strings, 'deprecated', strings['bc_icon_title_deprecated_' + (bcCategory === 'ext' ? 'ext' : 'web')])
      legendItems.add('deprecated')
    }
    if (feature.status.standard_track === false) {
      nonStandardIcon = writeIcon(strings, 'non-standard')
      legendItems.add('non-standard')
    }
    if (experimentalIcon || deprecatedIcon || nonStandardIcon) {
      featureIcons = viperHTML`
<div class="bc-icons">\
${experimentalIcon}\
${deprecatedIcon}\
${nonStandardIcon}\
</div>`
    }
  }
  return viperHTML`${desc}${featureIcons}`
}

/* Use the key if no string is defined */
function stringOrKey (strings, key) {
  return strings[key] || key
}

/*
Returns the string to appear in the table cell, like "Yes", "No" or "?", "Partial"
or the version number

`added` and `removed` are either null, true, false or a string containing a version number
`partial` is either null, true, or false indicating partial_implementation
*/
function getCellString (strings, added, removed, partial) {
  let output
  switch (added) {
    case null:
      output = viperHTML`
              <abbr title="${strings['supportsShort_unknown_title']}">
                ${strings['supportsShort_unknown']}
              </abbr>`
      break
    case true:
      output = viperHTML`<abbr title="${strings['supportsLong_yes']}"
                class="bc-level-yes only-icon">
                <span>${strings['supportsLong_yes']}</span>
              </abbr>${strings['supportsShort_yes']}`
      break
    case false:
      output = viperHTML`<abbr title="${strings['supportsLong_no']}"
                class="bc-level-no only-icon">
                <span>${strings['supportsLong_no']}</span>
              </abbr>${strings['supportsShort_no']}`
      break
    default:
      output = viperHTML`<abbr title="${strings['supportsLong_yes']}"
                class="bc-level-yes only-icon">
                <span>${strings['supportsLong_yes']}</span>
              </abbr>${added}`
  }
  if (removed) {
    output = viperHTML`<abbr title="${strings['supportsLong_no']}"
              class="bc-level-no only-icon">
              <span>${strings['supportsLong_no']}</span>
            </abbr>\
${typeof (added) === 'boolean'
    // We don't know when supported started
    ? '?'
    // We know when
    : added
}&nbsp;— \
${typeof (removed) === 'boolean'
    // We don't know when supported ended
    ? '?'
    // We know when
    : removed
}`
    // removed wins over partial
  } else if (partial) {
    output = viperHTML`<abbr title="${strings['supportsLong_partial']}"
              class="bc-level-partial only-icon">
              <span>${strings['supportsLong_partial']}</span>
            </abbr>\
${typeof (added) !== 'string'
    // Display "Partial" instead of "Yes", "No", or "?" if we have no version string
    ? strings['supportsShort_partial']
    : added
}`
  }
  return output
}

/*
Given the support information for a browser, this returns
a CSS class to apply to the table cell.

`supportData` is a (or an array of) support_statement(s)
*/
function getSupportClass (supportInfo) {
  let cssClass = 'unknown'

  if (Array.isArray(supportInfo)) {
    // the first entry should be the most relevant/recent and will be treated as "the truth"
    checkSupport(supportInfo[0].version_added,
      supportInfo[0].version_removed,
      supportInfo[0].partial_implementation)
  } else if (supportInfo) { // there is just one support statement
    checkSupport(supportInfo.version_added,
      supportInfo.version_removed,
      supportInfo.partial_implementation)
  } else { // this browser has no info, it's unknown
    return 'unknown'
  }

  function checkSupport (added, removed, partial) {
    if (added === null) {
      cssClass = 'unknown'
    } else if (added) {
      cssClass = 'yes'
      if (removed) {
        cssClass = 'no'
      }
    } else {
      cssClass = 'no'
    }
    if (partial && !removed) {
      cssClass = 'partial'
    }
  }

  return cssClass
}

/**
 * Generate the note for a browser flag or preference
 * First checks version_added and version_removed to create a string indicating when
 * a preference setting is present. Then creates a (browser specific) string
 * for either a preference flag or a compile flag.
 *
 * @param {Record<string,string>} strings contains localized strings
 * @param {Object} supportData is a support_statement
 * @param {string} browserId is a compat_block browser ID
 *
 * @return {string} The note for the flags information.
 */
function writeFlagsNote (strings, supportData, browserId) {
  // TODO: Should these be stored somewhere else?
  const firefoxPrefs = 'about:config'
  const chromePrefs = 'chrome://flags'

  let support = ''
  if (typeof (supportData.version_added) === 'string') {
    support = strings['flag_support_start']
    support = support.replace('${versionAdded}', supportData.version_added)
  }

  if (typeof (supportData.version_removed) === 'string') {
    if (support) {
      support = strings['flag_support_range']
      support = support.replace('${versionAdded}', supportData.version_added)
    } else {
      support = strings['flag_support_end']
    }
    support = support.replace('${versionRemoved}', supportData.version_removed)
  }

  let start = strings['flag_start']
  if (support) {
    start = strings['flag_start_cont'].replace('${support}', support)
  }

  let flagsText = ''
  let settings = ''

  for (let i = 0; i < supportData.flags.length; i++) {
    let flag = supportData.flags[i]
    let nameString = viperHTML`<code>${flag.name}</code>`

    // value_to_set is optional
    let valueToSet = ''
    if (flag.value_to_set) {
      valueToSet = strings['flag_valueToSet'].replace('${valueToSet}', flag.value_to_set)
    }

    let typeString = stringOrKey(strings, `flag_type_${flag.type}`).replace('${valueToSet}', valueToSet)
    if (flag.type === 'preference') {
      settings = strings['flag_browser']
      switch (browserId) {
        case 'firefox':
        case 'firefox_android':
          settings = settings.replace('${browser}', stringOrKey(strings, `bc_icon_name_firefox`)).replace('${url}', firefoxPrefs)
          break
        case 'chrome':
        case 'chrome_android':
          settings = settings.replace('${browser}', stringOrKey(strings, `bc_icon_name_chrome`)).replace('${url}', chromePrefs)
          break
        default:
          settings = ''
          break
      }
    }

    flagsText += nameString + typeString

    if (i !== supportData.flags.length - 1) {
      flagsText += strings['flag_misc_joiner']
    } else {
      flagsText += strings['flag_misc_end']
    }
  }

  return viperHTML`${{html: start}}${{html: flagsText}}${{html: settings}}`
}

/*
Generates icons for the main cell
`supportData` is a support_statement

*/
function writeCellIcons (strings, support, legendItems) {
  let output = []

  if (Array.isArray(support)) {
    // the first entry should be the most relevant/recent and will be used for the main cell
    // TODO: Flatten the version support if applicable
    support = support[0]
  }
  if (support.prefix) {
    output.push(writeIcon(strings, 'prefix', support.prefix))
    legendItems.add('prefix')
  }

  if (support.notes) {
    output.push(writeIcon(strings, 'footnote'))
    legendItems.add('footnote')
  }

  if (support.alternative_name) {
    output.push(writeIcon(strings, 'altname', support.alternative_name))
    legendItems.add('altname')
  }

  if (support.flags) {
    output.push(writeIcon(strings, 'disabled'))
    legendItems.add('disabled')
  }

  return viperHTML`<div class="bc-icons">
        ${{html: output.join('\n        ')}}
      </div>`
}

/*
Create notes section

`supportData` is a support_statement
`browserId` is a compat_block browser ID

*/
function writeNotes (strings, support, browserId, legendItems) {
  function writeSingleNote (strings, support, browserId, legendItems) {
    let notes = []

    if (support.prefix) {
      notes.push({
        icon: writeIcon(strings, 'prefix', support.prefix),
        text: strings['bc_icon_title_prefix'].replace('$1$', support.prefix)
      })
    }

    if (support.notes) {
      if (Array.isArray(support.notes)) {
        for (let note of support.notes) {
          notes.push({
            icon: writeIcon(strings, 'footnote'),
            text: note
          })
        }
      } else {
        notes.push({
          icon: writeIcon(strings, 'footnote'),
          text: support.notes
        })
      }
    }

    if (support.alternative_name) {
      notes.push({
        icon: writeIcon(strings, 'altname', support.alternative_name),
        text: strings['bc_icon_title_altname'].replace('$1$', support.alternative_name)
      })
    }

    if (support.flags) {
      notes.push({
        icon: writeIcon(strings, 'disabled'),
        text: writeFlagsNote(strings, support, browserId)
      })
    }

    return viperHTML` <dt class="${`bc-supports-${getSupportClass(support)} bc-supports`}">
      ${getCellString(strings,
    support.version_added,
    support.version_removed,
    support.partial_implementation)}
      ${writeCellIcons(strings, support, legendItems)}
    </dt>
    ${notes.length > 0
    ? notes.map(note => viperHTML(note)`<dd>
      ${note.icon}
      ${{html: note.text}}
    </dd>
    `)
    : viperHTML`<dd/>`}`
  }

  return viperHTML`
<section class="bc-history" aria-hidden="true">
  <dl>
    ${Array.isArray(support)
    ? Array.from(support, supportItem => writeSingleNote(strings, supportItem, browserId, legendItems))
    : writeSingleNote(strings, support, browserId, legendItems)}
  </dl>
</section>
`
}

/*
For a single row, write all the cells that contain support data.
(That is, every cell in the row except the first, which contains
an identifier for the row,  like "Basic support".

*/
function writeCompatCells (strings, supportData, displayBrowers, legendItems) {
  return viperHTML`${displayBrowers.map(browserNameKey => {
    let needsNotes = false
    let support = supportData[browserNameKey]
    let supportInfo
    if (support) {
      // Take first support data
      let supportShort = Array.isArray(support) ? support[0] : support
      supportInfo = getCellString(strings,
        supportShort.version_added,
        supportShort.version_removed,
        supportShort.partial_implementation)
      needsNotes = Array.isArray(support) ||
        support.notes || support.prefix || support.flags || support.alternative_name
    } else { // browsers are optional in the data, display them as "?" in our table
      supportInfo = getCellString(strings, null)
    }

    let supportClass = getSupportClass(support)
    return viperHTML`<td class="${`bc-supports-${supportClass} bc-browser-${browserNameKey} ${needsNotes ? 'bc-has-history' : ''}`}">
    ${supportInfo}
    ${needsNotes ? [
    writeCellIcons(strings, support, legendItems),
    writeNotes(strings, support, browserNameKey, legendItems)
  ] : undefined}
  </td>
  `
  })}`
}

function writeLegend (strings, legendItems) {
  let sortOrder = ['support_yes', 'support_partial', 'support_no', 'support_unknown',
    'experimental', 'non-standard', 'deprecated',
    'footnote', 'disabled', 'altname', 'prefix']
  let sortedLegendItems = Array.from(legendItems).sort(function (a, b) {
    return sortOrder.indexOf(a) - sortOrder.indexOf(b)
  })

  return viperHTML`<section class="bc-legend">
    <h3 class="offscreen">${strings['legend']}</h3>
    <dl>
      ${sortedLegendItems.map(item => {
    if (item.indexOf('support_') !== -1) {
      let supportType = item.substring(item.indexOf('_') + 1)
      return viperHTML`<dt>
        <span class="${`bc-supports-${supportType} bc-supports`}">
          <abbr title="${strings['supportsLong_' + supportType]}" class="${`bc-level bc-level-${supportType} only-icon`}">
            <span>${strings['supportsLong_' + supportType]}</span>&nbsp;
          </abbr>
        </span>
      </dt>
      <dd>${strings['supportsLong_' + supportType]}</dd>
      `
    // handle icons
    } else {
      return viperHTML`<dt>${writeIcon(strings, item, '', true)}</dt>
      <dd>${strings['legend_' + item]}</dd>
      `
    }
  })}
    </dl>
  </section>`
}

module.exports = render
