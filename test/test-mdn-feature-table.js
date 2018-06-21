/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const extend = require('extend')

const jsdom = require('jsdom'); const {JSDOM} = jsdom
const {assert} = require('chai')
const {mdnFeatureTable} = require('../src/renderers')

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures/mdn-feature-table')

let fixtureCompatData = {}
fs.readdirSync(FIXTURE_DIR).forEach(file => {
  const fileName = path.resolve(FIXTURE_DIR, file)
  if (fs.statSync(fileName).isFile()) {
    fixtureCompatData = extend(true, fixtureCompatData, JSON.parse(
      fs.readFileSync(fileName, 'utf8')
    ))
  }
})

const macro = (query, env = {}) => {
  let forMDNURL
  if (env.slug) {
    forMDNURL = `https://developer.mozilla.org/docs/${env.slug}`
  }
  return mdnFeatureTable(query.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined
  }, fixtureCompatData), {query, forMDNURL})
}

describe('test "mdnFeatureTable"', () => {
  it('Outputs a message if there is no data for the query "foo.bar"', () => {
    let actual = macro('foo.bar')
    let expected = 'No compatibility data found. Please contribute data for "foo.bar" (depth: 1) to the <a href="https://github.com/mdn/browser-compat-data">MDN compatibility data repository</a>.'
    return assert.equal(actual, expected)
  })

  // Different content areas have different platforms (desktop, mobile, server)
  // which consist of different browsers
  // Tests content_areas.json
  it('Creates correct platform and browser columns for API data', () => {
    const dom = JSDOM.fragment(macro('api.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table').classList), 'bc-table-web')
    assert.equal(dom.querySelector('.bc-platform-desktop').colSpan, '6')
    assert.equal(dom.querySelector('.bc-platform-mobile').colSpan, '7')
  })
  it('Creates correct platform and browser columns for CSS data', () => {
    const dom = JSDOM.fragment(macro('css.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table').classList), 'bc-table-web')
    assert.equal(dom.querySelector('.bc-platform-desktop').colSpan, '6')
    assert.equal(dom.querySelector('.bc-platform-mobile').colSpan, '7')
  })
  it('Creates correct platform and browser columns for HTML data', () => {
    const dom = JSDOM.fragment(macro('html.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table').classList), 'bc-table-web')
    assert.equal(dom.querySelector('.bc-platform-desktop').colSpan, '6')
    assert.equal(dom.querySelector('.bc-platform-mobile').colSpan, '7')
  })
  it('Creates correct platform and browser columns for HTTP data', () => {
    const dom = JSDOM.fragment(macro('http.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table').classList), 'bc-table-web')
    assert.equal(dom.querySelector('.bc-platform-desktop').colSpan, '6')
    assert.equal(dom.querySelector('.bc-platform-mobile').colSpan, '7')
  })
  it('Creates correct platform and browser columns for JavaScript data', () => {
    const dom = JSDOM.fragment(macro('javascript.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table').classList), 'bc-table-js')
    assert.equal(dom.querySelector('.bc-platform-desktop').colSpan, '6')
    assert.equal(dom.querySelector('.bc-platform-mobile').colSpan, '7')
    assert.equal(dom.querySelector('.bc-platform-server').colSpan, '1')
  })
  it('Creates correct platform and browser columns for WebExtensions data', () => {
    const dom = JSDOM.fragment(macro('webextensions.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table').classList), 'bc-table-ext')
    assert.equal(dom.querySelector('.bc-platform-desktop').colSpan, '4')
    assert.equal(dom.querySelector('.bc-platform-mobile').colSpan, '1')
  })

  // Tests feature_labels.json and status icons
  it('Creates correct feature labels for bare features', () => {
    const dom = JSDOM.fragment(macro('api.bareFeature'))

    assert.equal(dom.querySelector('.bc-table tbody tr th').innerHTML, 'Basic support')
    assert.equal(dom.querySelector('.bc-table tbody tr:nth-child(2) th').innerHTML, '<code>bareSubFeature</code>')
  })
  it('Creates correct feature labels for features with descriptions', () => {
    const dom = JSDOM.fragment(macro('api.feature_with_description'))

    assert.equal(dom.querySelector('.bc-table tbody tr th').innerHTML, 'Basic support')
    assert.equal(dom.querySelector('.bc-table tbody tr:nth-child(2) th').innerHTML, '<code>Interface()</code> constructor')
  })
  it('Creates correct feature labels for features with an MDN URL', () => {
    const dom = JSDOM.fragment(macro('api.feature_with_mdn_url', {slug: 'Web/HTTP/Headers/Content-Security-Policy'}))

    assert.equal(dom.querySelector('.bc-table tbody tr th').innerHTML, 'Basic support')
    assert.equal(dom.querySelector('.bc-table tbody tr:nth-child(2) th').innerHTML,
      '<a href="/docs/Web/HTTP/Headers/Content-Security-Policy/child-src"><code>subfeature_with_mdn_url</code></a>')
  })
  it('Creates correct feature labels for features with an MDN URL and a description', () => {
    const dom = JSDOM.fragment(macro('api.feature_with_mdn_url_and_description', {slug: 'Web/HTTP/Headers/Content-Security-Policy'}))

    assert.equal(dom.querySelector('.bc-table tbody tr th').innerHTML, 'Basic support')
    assert.equal(dom.querySelector('.bc-table tbody tr:nth-child(2) th').innerHTML,
      '<a href="/docs/Web/HTTP/Headers/Content-Security-Policy/child-src">CSP: child-src</a>')
  })
  it('Creates correct labels for experimental/non-standard features', () => {
    const dom = JSDOM.fragment(macro('api.experimental_feature'))

    assert.equal(dom.querySelector('.bc-table tbody tr th').textContent, 'Basic support Experimental')
    assert.equal(dom.querySelector('.bc-table tbody tr:nth-child(2) th').textContent,
      'experimental_non-standard_sub_feature ExperimentalNon-standard')
  })
  it('Creates correct labels for deprecated features with a description', () => {
    const dom = JSDOM.fragment(macro('api.deprecated_feature_with_description'))

    assert.equal(dom.querySelector('.bc-table tbody tr th').textContent, 'Basic support Deprecated')
    assert.equal(dom.querySelector('.bc-table tbody tr:nth-child(2) th').textContent,
      'Deprecated syntax Deprecated')
  })

  // Test different support cells, like yes, no, version, partial support
  // Tests support_variations.json
  it('Creates correct cell content for no support', () => {
    const dom = JSDOM.fragment(macro('html.no_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-no')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'No support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, 'No')
  })
  it('Creates correct cell content for unknown version support', () => {
    const dom = JSDOM.fragment(macro('html.unknown_version_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-yes')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'Full support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, 'Yes')
  })
  it('Creates correct cell content for support with a known version', () => {
    const dom = JSDOM.fragment(macro('html.versioned_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-yes')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'Full support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, '25')
  })
  it('Creates correct cell content for removed support with known versions', () => {
    const dom = JSDOM.fragment(macro('html.removed_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-no')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'No support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, '25 — 35')
  })
  it('Creates correct cell content for removed support with unknown support start', () => {
    const dom = JSDOM.fragment(macro('html.removed_support_unknown_start'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-no')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'No support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, '? — 35')
  })
  it('Creates correct cell content for removed support with unknown support end', () => {
    const dom = JSDOM.fragment(macro('html.removed_support_unknown_end'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-no')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'No support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, '25 — ?')
  })
  it('Creates correct cell content for removed support with unknown support range', () => {
    const dom = JSDOM.fragment(macro('html.removed_support_unknown_range'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-no')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'No support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, '? — ?')
  })
  it('Creates correct cell content for partial support and known version number', () => {
    const dom = JSDOM.fragment(macro('html.partial_versioned_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-partial')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'Partial support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, '25')
  })
  it('Creates correct cell content for partial support and unknown version number', () => {
    const dom = JSDOM.fragment(macro('html.partial_unknown_version_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-partial')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'Partial support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, ' Partial')
  })
  it('Creates correct cell content for partial support and no support', () => {
    const dom = JSDOM.fragment(macro('html.partial_no_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-partial')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'Partial support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, ' Partial')
  })
  it('Creates correct cell content for partial support and unknown support', () => {
    const dom = JSDOM.fragment(macro('html.partial_unknown_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-partial')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'Partial support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, ' Partial')
  })
  it('Creates correct cell content for partial support and removed support', () => {
    const dom = JSDOM.fragment(macro('html.partial_removed_support'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td:nth-child(4)').classList), 'bc-supports-no')
    assert.equal(dom.querySelector('.bc-table tbody tr td:nth-child(4) abbr span').textContent, 'No support')
    assert.include(dom.querySelector('.bc-table tbody tr td:nth-child(4)').textContent, '25 — 35')
  })

  // Test icons in main cells
  it('Adds an icon and a note section if a current main feature has an alternative name', () => {
    const dom = JSDOM.fragment(macro('alternative_name.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td').classList), 'bc-has-history')
    assert.include(Array.from(dom.querySelector('.bc-icons i').classList), 'ic-altname')
  })
  it('Adds an icon and a note section if a current main feature has notes', () => {
    const dom = JSDOM.fragment(macro('notes.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td').classList), 'bc-has-history')
    assert.include(Array.from(dom.querySelector('.bc-icons i').classList), 'ic-footnote')
  })
  it('Adds an icon and a note section if a current main feature has a flag', () => {
    const dom = JSDOM.fragment(macro('flags.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td').classList), 'bc-has-history')
    assert.include(Array.from(dom.querySelector('.bc-icons i').classList), 'ic-disabled')
  })
  it('Adds an icon and a note section if a current main feature has a prefix', () => {
    const dom = JSDOM.fragment(macro('prefixes.feature'))

    assert.include(Array.from(dom.querySelector('.bc-table tbody tr td').classList), 'bc-has-history')
    assert.include(Array.from(dom.querySelector('.bc-icons i').classList), 'ic-prefix')
  })
  it('Adds a note icon if the first element in a support array has a note', () => {
    const dom = JSDOM.fragment(macro('notes.feature'))

    assert.include(Array.from(dom.querySelector('.bc-browser-firefox > .bc-icons > abbr > i').classList), 'ic-footnote')
  })

  // Test flags
  it('Creates correct notes for flags', () => {
    const dom = JSDOM.fragment(macro('flags.feature'))

    assert.equal(dom.querySelectorAll('section.bc-history dl dd')[0].textContent,
      'Disabled From version 10: this feature is behind the Enable experimental Web Platform features preference. To change preferences in Chrome, visit chrome://flags.')
    assert.equal(dom.querySelectorAll('section.bc-history dl dd')[1].textContent,
      'Disabled From version 17: this feature is behind the --number-format-to-parts runtime flag.')
    assert.equal(dom.querySelectorAll('section.bc-history dl dd')[2].textContent,
      '') // empty for the "version_added: 12" range that has no flag
    assert.equal(dom.querySelectorAll('section.bc-history dl dd')[3].textContent,
      'Disabled From version 5: this feature is behind the layout.css.vertical-text.enabled preference (needs to be set to true). To change preferences in Firefox, visit about:config.')
    assert.equal(dom.querySelectorAll('section.bc-history dl dd')[4].textContent,
      'Disabled From version 45: this feature is behind the foo.enabled preference and the bar.enabled preference.')
    assert.equal(dom.querySelectorAll('section.bc-history dl dd')[5].textContent,
      'Disabled From version 55 until version 60 (exclusive): this feature is behind the --datetime-format-to-parts compile flag.')
  })
})
