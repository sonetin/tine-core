/**
 * @name tine features
 * @namespace tine
 * @version 0.0.1
 * @author Arnaud Leymet
 * @copyright 2015 Arnaud Leymet. All rights reserved.
 * @license All rights reserved.
 * @see https://github.com/tineapp/tine/blob/master/LICENSE.md
 */


/*var internalLinkDetection = {
  type: "detector",
  category: "general",
  name: "internal-link-detection",
  label: "internal link",
  detect: /^\w+\.html/,
  example: "help.html",
  process: function (block, lines, options) {
    return lines.map(function (line) {
      return line.replace(/(\w+([^\s\t\/]+)([^\s\t]*))/g, function (match, page) {
        return "<a href='" + page + "'><img class='bookmark'>" + page + "</a>";
      });
    }).join("\n");
  }
};*/
var externalLinkDetection = {
  type: "detector",
  category: "general",
  name: "external-link-detection",
  label: "link",
  detect: /^\w+\:\/\/[^\s\t]+/,
  example: "http://www.gq.com/story/how-to-propose",
  process: function (block, lines, options) {
    return lines.map(function (line) {
      return line.replace(/(\w+:\/\/([^\s\t\/]+)([^\s\t]*))/g, function (match, url, domain) {
        // https://www.google.com/s2/favicons?domain=
        // https://logo.clearbit.com/
        return "<a href='" + url + "' target='_blank' class='tine-interactive-element'><img class='bookmark favicon' src='https://www.google.com/s2/favicons?domain=" + domain + "' onerror='this.removeAttribute(\"src\")'>" + url + "</a>";
      });
    }).join("\n");
  }
};
var todoDetection = {
  type: "detector",
  category: "general",
  name: "todo-detection",
  label: "todo",
  detect: /^[\s\t]*\[[\sx]\]/i,
  example: "[x] Done\n[ ] Todo",
  process: function (block, lines, options) {
    return lines.map(function (line) {
      var checked = /^[\s\t]*\[[x]\]/i.test(line);
      line = line.replace(/([\s\t]*)(\[[\sx]\])/i, "$1$2");
      line = line.replace(/([\s\t]*)(\[\s\])(.+)/, "$1$2<span class='done'>$3</span>");
      line = line.replace(/([\s\t]*)(\[[x]\])(\s*)(.+)/i, "$1<span class='check'>[×]</span>$3<span class='notdone'>$4</span>");
      line += "<input class='todo-checkbox' type='checkbox'" + (checked ? " checked" : "") + ">";
      return line;
    }).join("\n");
  }
};
var separatorDetection = {
  name: "separator-detection",
  type: "detector",
  category: "general",
  label: "separator",
  detect: /^[-—]{3,}$/,
  process: function (block, lines, options) {
    return "<hr />";
  }
};
var listDetection = {
  name: "list-detection",
  type: "detector",
  category: "general",
  label: "list",
  detect: /^([\s\t]*(1\.\s|-\s|\*\s)[^-]+\n?)+/,
  example: "- item #1\n- item #2"
};
var tasksDetection = {
  name: "tasks-detection",
  type: "detector",
  category: "general",
  label: "tasks",
  detect: /^.+[\s\t]*\:[\s\t]*\d+(\.\d+)?\s?%/,
  example: "Task #1: 50%\nTask #2: 90%",
  process: function (block, lines, options) {
    var results = [];
    var processed = lines.map(function (line) {
      var value = 0;
      try { value = parseFloat(/(\d+(\.\d+)?)\s?%/i.exec(line)[1]); } catch (err) {}
      results.push(value);
      return "<div class='task' style='width: " + value + "%'></div>" + line;
    }).join("\n");
    var total = results.reduce(function(a, b) { return a + b}) / results.length;
    // precision of 1 decimal
    total = Math.round(total * 10) / 10;
    if (results.length > 1) processed += "<div class='tine-absolute-element global-progress'>" + total + "%</div>"
    return processed;
  }
};
var formDetection = {
  type: "detector",
  category: "general",
  name: "form-detection",
  label: "form",
  detect: /^[^\.!]+\?.*\n[^\.!]+\?.*/i, // look for at least two following questions
  example: "What is your name?\nDo you like? [] Pizza [] Rice [] Pasta\nDo you eat vegetables? () yes () no\n\n\n",
  process: function (block, lines, options) {
    var form = "";
    var processed = lines.map(function (line) {
      return line.replace(/^(.+\?)(\s*\*?)([\s\t]*)(.*)/g, function (match, question, mandatory, spaces, options) {
        var type;
        if (options.length === 0) {
          type = "text";
        } else if (/^\[\s?\]/i.test(options)) {
          type = "checkbox";
        } else if (/^\(\s?\)/i.test(options)) {
          type = "radio";
        }
        var required = mandatory.split(/\s|\t/)[0];
        form += "<div class='form-group'></div>";
        form += "<label>" + question + "<input required=" + required + " type='" + type + "'></label>";
        return "<span class='question'>" + question + "</span><span class='mandatory'>" + mandatory + "</span>" + spaces + options;
      });
    }).join("\n");
    processed += "<form class='tine-absolute-element form' role='form'>" + form + "</form>";
    return processed;
  }
};
var calcDetection = {
  type: "detector",
  category: "calculation",
  name: "calc-detection",
  label: "calc",
  init: function () {
    // Mathjs - add currencies
    math.type.Unit.BASE_UNITS["CURRENCY"] = {}
    var euroUnit = { name: '€', base: math.type.Unit.BASE_UNITS.CURRENCY, prefixes: math.type.Unit.PREFIXES.SHORT, value: 1.1168, offset: 0 };
    math.type.Unit.UNITS["€"] = euroUnit;
    math.type.Unit.UNITS["EUR"] = euroUnit;
    var dollarUnit = { name: '$', base: math.type.Unit.BASE_UNITS.CURRENCY, prefixes: math.type.Unit.PREFIXES.SHORT, value: 1, offset: 0 };
    math.type.Unit.UNITS["$"] = dollarUnit;
    math.type.Unit.UNITS["USD"] = dollarUnit;

    // instantiate the parser
    this.compute = math.parser();

    window.copyToClipboard = function (node) {
      node.style["-webkit-user-select"] = "initial";
      node.style["-webkit-touch-select"] = "initial";
      node.style["user-select"] = "initial";
      if (document.body.createTextRange) {
        var range = document.body.createTextRange();
        range.moveToElementText(node);
        range.select();
      } else {
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      document.execCommand("copy");
      node.style["-webkit-user-select"] = "none";
      node.style["-webkit-touch-select"] = "none";
      node.style["user-select"] = "none";
    }
  },
  beforePageProcessing: function () {
    this.compute.clear();
  },
  detect: [
    // set variable
    /^[\s\t]*([a-zA-Z\u00C0-\u017F][a-zA-Z_\d\u00C0-\u017F\s]+)[\s\t]*[=:][\s\t]*(\S+)/,
    // calc
    /^(\-?\d[a-zA-Z_\d\u00C0-\u017F\s\t\+\-\/]*)|(f\()|(^[\s\t]*#\s*calc)/
  ],
  example: "eggs: 6         # set variables\n2 x eggs        # use operators\n100 EUR in USD  # currency conversion\n1 L + 10 cL     # units & arithmetic operations\nprev + 1 L      # references\n# also functions, complex numbers, matrices",
  process: function (block, lines, options) {
    var lastComputedResult,
        results = [],
        context = this;

    // http://stackoverflow.com/a/5912746
    var removeDiacritics = function (str) {
      var changes,
          defaultDiacriticsRemovalMap = [
          {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
          {'base':'AA','letters':/[\uA732]/g},
          {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
          {'base':'AO','letters':/[\uA734]/g},
          {'base':'AU','letters':/[\uA736]/g},
          {'base':'AV','letters':/[\uA738\uA73A]/g},
          {'base':'AY','letters':/[\uA73C]/g},
          {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
          {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
          {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
          {'base':'DZ','letters':/[\u01F1\u01C4]/g},
          {'base':'Dz','letters':/[\u01F2\u01C5]/g},
          {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
          {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
          {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
          {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
          {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
          {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
          {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
          {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
          {'base':'LJ','letters':/[\u01C7]/g},
          {'base':'Lj','letters':/[\u01C8]/g},
          {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
          {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
          {'base':'NJ','letters':/[\u01CA]/g},
          {'base':'Nj','letters':/[\u01CB]/g},
          {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
          {'base':'OI','letters':/[\u01A2]/g},
          {'base':'OO','letters':/[\uA74E]/g},
          {'base':'OU','letters':/[\u0222]/g},
          {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
          {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
          {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
          {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
          {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
          {'base':'TZ','letters':/[\uA728]/g},
          {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
          {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
          {'base':'VY','letters':/[\uA760]/g},
          {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
          {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
          {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
          {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
          {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
          {'base':'aa','letters':/[\uA733]/g},
          {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
          {'base':'ao','letters':/[\uA735]/g},
          {'base':'au','letters':/[\uA737]/g},
          {'base':'av','letters':/[\uA739\uA73B]/g},
          {'base':'ay','letters':/[\uA73D]/g},
          {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
          {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
          {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
          {'base':'dz','letters':/[\u01F3\u01C6]/g},
          {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
          {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
          {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
          {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
          {'base':'hv','letters':/[\u0195]/g},
          {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
          {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
          {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
          {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
          {'base':'lj','letters':/[\u01C9]/g},
          {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
          {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
          {'base':'nj','letters':/[\u01CC]/g},
          {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
          {'base':'oi','letters':/[\u01A3]/g},
          {'base':'ou','letters':/[\u0223]/g},
          {'base':'oo','letters':/[\uA74F]/g},
          {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
          {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
          {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
          {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
          {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
          {'base':'tz','letters':/[\uA729]/g},
          {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
          {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
          {'base':'vy','letters':/[\uA761]/g},
          {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
          {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
          {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
          {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
      ];
      if (!changes) {
        changes = defaultDiacriticsRemovalMap;
      }
      for(var i=0; i<changes.length; i++) {
        str = str.replace(changes[i].letters, changes[i].base);
      }
      return str;
    }

    return lines.map(function (line) {
      line = line.replace(/(\d\s*)x([^a-zA-Z])/g, "$1*$2");
      line = line.replace(/(.+[\s\%])x([\s\d])/g, "$1*$2");

      var lineToCompute = line;
      lineToCompute = removeDiacritics(lineToCompute);
      lineToCompute = lineToCompute.replace(/^(.+):/, "$1=");
      lineToCompute = lineToCompute.replace(/ of /g, " * ");
      lineToCompute = lineToCompute.replace(/ per /g, " * ");
      lineToCompute = lineToCompute.replace(/\%/g, " / 100 ");
      lineToCompute = lineToCompute.replace(/\%\s+of\s/g, " / 100 * ");
      lineToCompute = lineToCompute.replace(/^([\+\-\*\/])/, lastComputedResult + " $1");
      lineToCompute = lineToCompute.replace(/(^|\W)((sum)|(total))(?!\w)/g, "$1"+results.join(" + "));
      lineToCompute = lineToCompute.replace(/prev(?![a-z])/g, lastComputedResult);
      try {
        var computed = context.compute.eval(lineToCompute);
      } catch (e) {}

      var formatted = line;
      formatted = formatted.replace(/([a-zA-Z\u00C0-\u017F][a-zA-Z_\d\u00C0-\u017F]*)(\s*)([=:])/g, "<span class='variable'>$1</span>$2$3");
      formatted = formatted.replace(/\*/g, "×");
      switch (typeof computed) {
        case "undefined":
        case "function":
          break;
        case "number":
          // precision of 2 decimals
          computed = Math.round(parseFloat(computed) * 100) / 100;
        default:
          lastComputedResult = computed;
          results.push(computed);
          formatted += " <span class='result tine-interactive-element' onclick='window.copyToClipboard(this)'>" + computed + "</span>";
      }
      return formatted;
    }).join("\n");
  }
};
var htmlDetection = {
  type: "detector",
  category: "web",
  name: "html-detection",
  label: "html",
  init: function () {
    Prism.languages.html = Prism.languages.markup;
  },
  detect: /(^<!\w+)|(^<[^>]+>)/,
  example: '<button class="cool">button</button>\n',
  process: function (block, lines, options) {
    var output = block.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</code>";
    output += "<code class='tine-interactive-element tine-absolute-element'>" + block.replace(/(?:^#\s*(\w+)\n)|(?:^(\w+)>[\s\n])/, "");
    return output;
  }
};
var cssDetection = {
  type: "detector",
  category: "web",
  name: "css-detection",
  label: "css",
  detect: /^\s*[#\.\~><\[\]\+\*\@\w\s\-_]+\s*\{/,
  example: ".cool {\n  background: #4b9; color: white;\n  border: 0; padding: 6px 40px;\n  font-size: 14px; border-radius: 4px;\n}",
  process: function (block, lines, options) {
    return block + "</code><style>" + block + "</style><code>";
  }
};
var javascriptDetection = {
  type: "detector",
  category: "web",
  name: "javascript-detection",
  label: "js",
  init: function () {
    Prism.languages.js = Prism.languages.javascript;
    Prism.languages.es5 = Prism.languages.javascript;
    Prism.languages.es6 = Prism.languages.javascript;
    Prism.languages.es7 = Prism.languages.javascript;
  },
  detect: [
    // plain JS
    /^(\/\/)|^\/\*|^(function\s+\w+\()|^([a-zA-Z]\w*\.[a-zA-Z])|^var\s*\w+|^const\s*\w+/,
    // jQuery
    /(^\$\()|(^jQuery\()/
  ],
  example: "document.querySelector('.cool')\n  .innerText = 'cool button';",
  process: function (block, lines, options) {
    try {
      setTimeout(function () { eval(block) }, 0);
    } catch(e) { }
    return block;
  },
  processOutsideCode: function (block, lines, options) {
    var linter = JSHINT(block);
    if (linter) {
      return "<span class='tine-interactive-element tine-code-valid' title='JSHint reported this code as being valid'></span>";
    } else {
      return "<span class='tine-interactive-element tine-code-invalid' title='JSHint reported problems with this code'></span>";
    }
  }
};
var coffeescriptDetection = {
  type: "detector",
  category: "software programming",
  name: "coffeescript-detection",
  label: "coffee",
  init: function () {
    Prism.languages.coffee = Prism.languages.coffeescript;
  },
  detect: /[\-\=]>/,
  example: "square = (x) -> x * x"
};
var pythonDetection = {
  type: "detector",
  category: "software programming",
  name: "python-detection",
  label: "py",
  init: function () {
    Prism.languages.py = Prism.languages.python;
  },
  detect: /^\s*def\s+\w+\s*\([^\)]*\)\:/,
  example: "def fn():\n    // ..."
};
var rubyDetection = {
  type: "detector",
  category: "software programming",
  name: "ruby-detection",
  label: "ruby",
  detect: /(^#\!\/usr\/bin\/ruby)|(^s*module\s+)|(^s*class\s+)|(^\s*def\s+)|(^<%)/,
  example: "def square(x)\n  x ** x\nend"
};
var phpDetection = {
  type: "detector",
  category: "software programming",
  name: "php-detection",
  label: "php",
  detect: /^<\?/,
  example: "<?php echo 'PHP is the future of the day before yesterday.'; ?>"
};
var javaDetection = {
  type: "detector",
  category: "software programming",
  name: "java-detection",
  label: "java",
  detect: /^import\s(static\s)?java/,
  example: "import java.io.*;\npublic class MyClass { }"
};
var bashDetection = {
  type: "detector",
  category: "low-level programming",
  name: "bash-detection",
  label: "bash",
  detect: /(^#\!\/bin\/bash)|(^\s*\$\s)/,
  example: "$ tail -f /var/log/mail.log"
};
var cDetection = {
  type: "detector",
  category: "software programming",
  name: "c-detection",
  label: "c",
  detect: /(^#include)|((^int)|(^void)\s\w+\()/,
  example: "#include <stdio.h>\nint main() { return 0; }"
};
var objectivecDetection = {
  type: "detector",
  category: "software programming",
  name: "objectivec-detection",
  label: "objc",
  init: function () {
    Prism.languages.objc = Prism.languages.objectivec;
  },
  detect: /^#import\s+<objc/,
  example: "#import <objc>"
};
var rustDetection = {
  type: "detector",
  category: "software programming",
  name: "rust-detection",
  label: "rust",
  detect: /^fn\s\w/,
  example: "fn main() { }"
};
var sqlDetection = {
  type: "detector",
  category: "database programming",
  name: "sql-detection",
  label: "sql",
  detect: /(^CREATE)|(^ALTER)|(^DROP)|(^SELECT)|(^UPDATE)|(^DELETE)\s/i,
  example: "SELECT *, COUNT(*) FROM `users`;"
};
var markdownDetection = {
  type: "detector",
  category: "other syntaxes",
  name: "markdown-detection",
  label: "md",
  detect: /^>\s.+/,
  example: "> This is a markdown quote\nAnd some more *interesting* **formatting**",
  init: function () {
    Prism.languages.md = Prism.languages.markdown;
  }
};
var latexDetection = {
  type: "detector",
  category: "other syntaxes",
  name: "latex-detection",
  label: "latex",
  detect: /^\\\w+/,
  example: "\\documentclass[12pt]{article}\nBleh\n\\end{document}"
};
var commentDetection = {
  type: "detector",
  category: "general",
  name: "comment-detection",
  label: "comment",
  detect: /^[\s\t]*#[^\n]*(\n(?=[\s\t]*#)[^\n]+)*\n*$/
};
var tableDetection = {
  type: "detector",
  category: "general",
  name: "table-detection",
  label: "table",
  detect: /^(.*\t.*\n?)+/,
  example: "Name\tAge\tHair color\nBob\t12\tDark\nJohn\t17\tBlond",
  process: function (block, lines, options) {
    var theader = lines[0].replace(/\t/g, '\t</th><th>');
    var tbody = lines.splice(1).join("</td></tr><tr><td>").replace(/\t/g, '\t</td><td>');
    var output = "";
    output += "<thead><tr><th>" + theader + "</th></tr></thead>";
    output += "<tbody><tr><td>" + tbody + "</td></tr></tbody>";
    output = "<table>" + output + "</table>";
    return output;
  }
};
var abcDetection = {
  type: "detector",
  category: "other syntaxes",
  name: "abc-detection",
  label: "abc",
  detect: /^\%abc/,
  example: "%abc-2.1\nCCCD E2 D2 :|]\n\n\n",
  process: function (block, lines, options) {
    var id = "abc-" + Math.round(Math.random()*Math.exp(20));
    setTimeout(function () { ABCJS.renderAbc(id, lines.join("\n")) }, 0);
    return block + '<div id="' + id + '" class="tine-interactive-element tine-absolute-element"></div>';
  }
};
var textAnalysisDetection = {
  type: "detector",
  category: "text analysis",
  name: "text-analysis-detection",
  label: "text",
  example: "Morning guys! How do you feel today?\nAre you having fun? I sincerely hope so!\n\nIch habe diese schnetzle gefunden.\n\nJ'aime manger des baguettes.\n\n안녕하세요 어떻게 지내세요?\n\nVamos a la Playa.\n\nمِثَالٌ : خَبَر , وَعلامَةُ الرَّفْعِ الضَّمَةِ",
  process: function (block, lines, options) {
    var lang = options.lang;
    if (lang != "eng") return block;
    return lines.map(function (line) {
      return nlp.pos(line).sentences.map(function (sentence) {
        var words = sentence.tokens.map(function (word) {
          var classes = ["word", word.pos.tag, word.pos.parent];
          if (word.pos.parent === "verb") {
            if (word.pos.negative) classes.push("negative");
            classes.push(word.pos.tense);
          }
          if (word.pos.parent === "noun") {
            if (word.is_acronym) classes.push("acronym");
            if (word.is_plural) classes.push("plural");
            if (word.analysis.is_entity) classes.push("entity");
          }
          return { text: word.text, normalised: word.normalised, classes: classes };
        });
        var pos = 0;
        var text = line;
        return words.map(function (word) {
          text = text.substr(text.indexOf(word.text) + word.text.length);
          var regex = new RegExp('^(\\s+).*$');
          var spaces = text.replace(regex, "$1");
          /*console.debug("------");
          console.debug("text:", text);
          console.debug("word:", word.text, word.normalised);
          console.debug("regex:", regex);
          console.debug("spaces:", spaces);*/
          return "<span data-token=\"" + word.normalised + "\" class=\"" + word.classes.join(' ') + "\">" + word.text + "</span>" + spaces;
        }).join("");
      }).join("");
    }).join("\n");
  }
};

var customTheme = {
  type: "theme",
  name: "custom-theme",
  init: function () {
    this.editor.parentNode.parentNode.style.background = "#ffd";
  }
};

var tineCommands = {
  type: "detector",
  category: "tine bots",
  name: "tine-commands",
  label: "",
  detect: /^\/tine\s+/,
  example: "/tine ",
  process: function (block, lines, options) {
    var commands = Tine.features.filter(function (feature) {
      return feature.category == "tine bots" && feature.label;
    }).map(function (feature) {
      return feature.label;
    }).join(", ");
    return block + "<div class='tine-bot-instructions'>available commands: " + commands + "</div>";
  }
};

var tineCollaboration = {
  type: "detector",
  category: "tine bots",
  name: "tine-collaboration",
  label: "share, join",
  detect: /^\/tine\s+((share)|(join))\s*/,
  example: "/tine share\n\n/tine join [id]",
  init: function () {
    this.collaboration = this.collaboration || {};
    this.collaboration.connectedPeers = {};
    // handle text selection
    this.editor.addEventListener("select", function (event) {
      console.log("select", event); }
    );
  },
  onTextChange: function () {
    if (!this.collaboration.peer) return;
    var context = this;
    for (var c in this.collaboration.peer.connections) {
      var connection = this.collaboration.peer.connections[c];
      connection.forEach( function (conn) {
        conn.send({
          when: new Date().getTime(),
          text: context.editor.value
        });
      });
    }
  },
  process: function (block, lines, options) {
    var context = this;

    var initializePeer = function () {
      if (!this.collaboration.peer) {
        console.log("collaboration:", "start");
        /*this.collaboration.peer = this.collaboration.peer || new Peer({
          host: 'peerserver.tineapp.com',
          port: 80,
          key: 'tineapp-key',
          path: 'ws'
        });*/
        this.collaboration.peer = this.collaboration.peer || new Peer({ key: '982j6usn5c23xr' });
        this.collaboration.peer.on('connection', peerCommunication);
      }
    };
    var peerCommunication = function (c) {
      c.on('data', function(data) {
        console.log("collaboration:", "receiving data:", data.text.length);
        context.editor.value = data.text;
        context.render(false);
        context.collaboration.connectedPeers[c.peer] = 1;
      });
      c.on('close', function () {
        console.log("collaboration:", c.peer + ' left.');
        delete context.collaboration.connectedPeers[c.peer];
      });
    };

    if (id = block.match(/^\/tine\s+share\s*/)) {
      // share
      initializePeer.call(context);
      var peerId = this.collaboration.peer.id;
      if (!peerId) {
        return block + "<div class='tine-bot-instructions'>ask your mate to write: \"/tine join <i>[loading id&hellip;]</i>\"</div>";
      } else {
        return block + "<div class='tine-bot-instructions'>ask your mate to write: \"/tine join " + peerId  + "\"</div>";
      }
    } else if (match = block.match(/^\/tine\s+join\s+(\w{16})$/)) {
      // join
      var remoteId = match[1];
      initializePeer.call(context);
      if (!this.collaboration.connectedPeers[remoteId]) {
        var c = this.collaboration.peer.connect(remoteId, {
          label: 'chat',
          metadata: { message: 'hi i want to chat with you!' }
        });
        c.on('open', function () {
          peerCommunication(c);
        });
      }
      //c.on('error', function(err) { alert(err); });
      return block + "<div class='tine-bot-instructions'>connecting to: " + remoteId + "...</div>";
    } else if (block.match(/^\/tine\s+join\s*/)) {
      // join syntax
      return block + "<div class='tine-bot-instructions'>write the id of the sharer</div>";
    }
    return block;
  }
};

// Add features in the right order
console.debug("tine:", "adding features");
//Tine.addFeature(internalLinkDetection);
Tine.addFeature(externalLinkDetection);
Tine.addFeature(todoDetection);

// non-processed languages
Tine.addFeature(bashDetection);
Tine.addFeature(cDetection);
Tine.addFeature(coffeescriptDetection);
Tine.addFeature(javaDetection);
Tine.addFeature(latexDetection);
Tine.addFeature(markdownDetection);
Tine.addFeature(objectivecDetection);
Tine.addFeature(phpDetection);
Tine.addFeature(pythonDetection);
Tine.addFeature(rubyDetection);
Tine.addFeature(rustDetection);
Tine.addFeature(sqlDetection);

// processed languages
Tine.addFeature(htmlDetection);
Tine.addFeature(cssDetection);
Tine.addFeature(javascriptDetection);

Tine.addFeature(tasksDetection);
Tine.addFeature(listDetection);
Tine.addFeature(formDetection);
Tine.addFeature(separatorDetection);
Tine.addFeature(calcDetection);
Tine.addFeature(commentDetection);
Tine.addFeature(tableDetection);
Tine.addFeature(abcDetection);
//Tine.addFeature(customTheme);

Tine.addFeature(tineCollaboration);
Tine.addFeature(tineCommands);

Tine.addFeature(textAnalysisDetection);

console.debug("tine:", "features added");

// dates
// places
// people
// pictures
// music
// videos
// page linking
// tine theming
// linters - https://github.com/showcases/clean-code-linters
