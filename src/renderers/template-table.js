const fs = require('fs')
const handlebars = require('handlebars')

const englishStrings = require('./english-strings')

const templates = {
    table:  fs.readFileSync('./src/renderers/templates/table.hbs', 'utf-8'),
    header: fs.readFileSync('./src/renderers/templates/header.hbs', 'utf-8'),
    legend: fs.readFileSync('./src/renderers/templates/legend.hbs', 'utf-8'),
    body:   fs.readFileSync('./src/renderers/templates/body.hbs', 'utf-8'),
}

const browsers = {
    'desktop': ['chrome', 'edge', 'firefox', 'ie', 'opera', 'safari'],
    'mobile': ['webview_android', 'chrome_android', 'edge_mobile', 'firefox_android', 'opera_android', 'safari_ios', 'samsunginternet_android'],
    'server': ['nodejs'],
    'webextensions-desktop': ['chrome', 'edge', 'firefox', 'opera'],
    'webextensions-mobile': ['firefox_android']
}

/* Use the key if no string is defined */
function stringOrKey (strings, key) {
    return strings[key] || key
  }

function tableContext(category, platforms, browsers) {
    return {
        category,
        header: headerContext(platforms, browsers)
    }
}

function headerContext(platforms, displayBrowsers) {
    let platformHeader = []
    for (platform of platforms) {
        let count = Object.keys(browsers[platform]).length
        let id = platform.replace('webextensions-', '')

        platformHeader.push({
            id,
            childLength: count,
            icon: writeIcon(englishStrings, id)
        })
    }

    let browserHeader = []
    for (browser of displayBrowsers) {
        browserHeader.push({
            id: browser,
            icon: writeIcon(englishStrings, browser)
        })
    }

    return {
        browser: browserHeader,
        platform: platformHeader
    }

    /* Write a icon with localized hover text */
    function writeIcon (strings, id) {
        let iconName = stringOrKey(strings, 'bc_icon_name_' + id)
        let iconTitle = stringOrKey(strings, 'bc_icon_title_' + id)

        // there is no iconTitle, fall back to iconName
        if (iconTitle === 'bc_icon_title_' + id) {
            iconTitle = iconName
        }

        return {
            title: iconTitle,
            slug: id
        }
    }
}

function render(configuration) {
    const category = configuration.query.split('.')[0]

    let cssClassCategory
    let platforms = ['desktop', 'mobile']
    let displaybrowsers = [...browsers['desktop'], ...browsers['mobile']]

    cssClassCategory = 'web';

    if(category === 'javascript') {
        cssClassCategory = 'js'
        displaybrowsers.push(...browsers['server'])
        platforms.push('server')
    } else if (category === 'webextensions') {
        cssClassCategory = 'ext'
        displaybrowsers = [...browsers['webextensions-desktop'], ...browsers['webextensions-mobile']]
        platforms = ['webextensions-desktop', 'webextensions-mobile']
    }
    
    const template = handlebars.compile(templates.table);
    handlebars.registerPartial('header', templates.header)
    let html = template(tableContext(category, platforms, displaybrowsers))

    return html;
}

console.log(render({query: 'webextensions.api.alarms'}))