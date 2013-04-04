// A tiny object to perform string substitution for translation
// No pluralization or anything fancier

// The simplest thing that could possibly work

// Initialize with an object containing
// language codes for keys and key->string for value
// i.e.
// {
//   'en': {
//     doc: 'Document',
//     annot: 'Annotation'
//   },{
//     'zh': {
//       doc:'文件'
//       annot: '註解'
//     }
//   }
//  }


I18n = function( options ){
  this.translations = options.translations || {};
  this.aliases      = options.aliases      || [];
  this.viewer       = options.viewer;

  if ( options.underscore )
    this.extend_underscore( options.underscore );

  if ( true === options.autoDetect )
    this.detectLocale();

  if ( this.viewer && this.viewer.schema.document.langauge ){
    this.setLocale( this.viewer.schema.document.langauge );
  }

};


// If translation string is not available for the current locale, 
// attempts to find it in the 'en' locale or returns
// an empty string
I18n.prototype.lookup = function( key, options ){
  return ( this.translations[ this.locale ] || this.translations['eng'] )[ key ] || '';
};


// Aliases
// we get strings like zh-cn and en-GB back from various browsers
// We need to normalize that to a language set (where appropriate)
//
// since case differs between IE and chrome/firefox, the language
// is converted to lowercase before the alias is evaluated
//
// an alias can be either a regex, string, or function
// Examples:
// { 'zh': 'zh-sg' }  // will use the zh language set for detected 'zh-sg'
// { 'zh': ['zh-sg', 'zh-cn'] }  // use zh for both Singapore and PRC
// { 'zh': new Regex('zh-\w{2}') }  // match anything that starts with zh- 
// { 'zh' function(lang){ return lang=='zh-cn' } } // same as the first example

// accepts an array of aliases
I18n.prototype.setAliases = function( aliases ){
  this.aliases = aliases || [];
  return this;
};

var evalAlias=function( alias, detected ){
  return ( ( _.isString(alias) && alias === detected ) ||
           ( _.isArray(alias) && -1 != alias.indexOf(detected) ) ||
           ( _.isRegExp(alias) && detected.match(alias) ) ||
           ( _.isFunction(alias) && true == alias.call( detected ) )
       );
};

// Sniffs the browser's navigator.language || navigator.userLanguage
// converts it to lowercase and runs through each of the aliases
// Sets the locale to the first matching alias
I18n.prototype.detectLocale = function(){
  var lang = ( navigator.language || navigator.userLanguage || '' ).toLowerCase();
  for (var i = 0, l = this.aliases.length; i < l; i++) {
    var alias = this.aliases[i];
    for (var key in alias) {
      if ( alias.hasOwnProperty(key) && true === evalAlias( alias[key], lang ) ){
        lang = key;
        break;
      }
    }
  }
  if ( this.translations[ lang ] )
    this.setLocale( lang );
  return this.locale;
};

I18n.prototype.setLocale = function( code ){
  if ( ! this.translations[ code ] ){
    var url = this.viewer.schema.data.translationsURL.
          replace(/\{language\}/, code ).
          replace(/\{realm\}/, 'viewer' ) + '.json';
    var i18n = this;
    DV.jQuery.ajax( {
      url: url,
      dataType: 'jsonp',
      success: function( translation ){
        i18n.translations[ code ] = translation;
        i18n.viewer.api.redraw();
      }
    } );
  }

  this.locale = code;
  return this;
};

I18n.prototype.reset = function( translations ){
  this.translations = translations || {};
  return this;
};

I18n.prototype.extend_underscore = function( underscore ){
  underscore.t = underscore.bind( this.lookup, this );
  return this;
};
