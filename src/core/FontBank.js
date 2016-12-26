define(['assets/FreeSans',
        'assets/FreeSerif'],
       function (FreeSansData,
                 FreeSerifData) {
           'use strict';

           /**
            * @brief Normalizes string as font name. This is used for minimizing font name
            * comparison errors.
            * @param name
            * @returns {string}
            */
           function normalizeFontName(name)
           {
               var normalizedName = name.replace(/'/g, '');
               normalizedName = normalizedName.replace(/"/g, '');
               normalizedName = normalizedName.replace(/ /g, '');
               return normalizedName.toLowerCase();
           }

           /**
            * @class Font Data Class
            * @constructor
            */
           function FontData(oneFontLoadedCallback) {

               /**
                * @brief Initializes data
                * @param data
                */
               this.init = function(data)
               {
                   // copy meta data of the bitmap font
                   this.name = normalizeFontName(data.name);
                   this.size = data.size;
                   this.bold = data.bold;
                   this.italic = data.italic;
                   this.charset = data.charset;
                   this.lineHeight = data.lineHeight;
                   this.base = data.base;
                   this.imageSize = data.imageSize;
                   this.fileName = data.fileName;

                   // try to load font image immediately
                   this.isLoaded = false;
                   this.image = new Image();
                   this.image.onload = function () {
                       this.isLoaded = true;
                       oneFontLoadedCallback();
                   }.bind(this);
                   this.image.src = require.toUrl('assets/' + this.fileName);

                   // copy chars map
                   this.chars=[];
                   for (var i=0; i < data.chars.length; i++)
                   {
                       var ch = data.chars[i];

                       // calculate texture coordinates
                       var leftX = ch.x / this.imageSize[0];
                       var rightX = (ch.x + ch.width) / this.imageSize[0];
                       var bottomY = (this.imageSize[1] - (ch.y + ch.height)) / this.imageSize[1];
                       var topY = (this.imageSize[1] - ch.y) / this.imageSize[1];

                       ch.uv = [
                           rightX, bottomY,
                           rightX, topY,
                           leftX, bottomY,
                           leftX, topY
                       ];

                       this.chars[ch.id] = ch;
                   }

                   // build kerning index according to the second item
                   for(var i=0; i<data.kernings.length; i++)
                   {
                       var kerning = data.kernings[i];

                       // use 'second' item for indexing
                       var ch = this.chars[kerning.second];

                       if(ch.kernings === undefined)
                       {
                           ch.kernings = [];
                       }

                       ch.kernings[kerning.first] = kerning.amount;
                   }
               };

               /**
                * @brief Returns char's font data
                 * @param charCode
                * @returns {*}
                */
               this.getChar = function(charCode)
               {
                   return this.chars[charCode];
               };
           }

           /**
            * @class Font Bank Class
            */
           function FontBank(fontLoadedCallback) {

               /**
                * @brief Fonts array
                * @type {Array}
                */
               this.fonts = [];

               /**
                * @brief This callback is called after all fonts are loaded
                */
               this.fontLoadedCallback = fontLoadedCallback;

               /**
                * @brief Default font
                * @type {undefined}
                */
               this.defaultFont = undefined;

               /**
                * @brief Total requested font count
                * @type {number}
                */
               this.totalRequestedFontCount = 0;

               /**
                * @brief Total loaded font count
                * @type {number}
                */
               this.totalLoadedFontCount = 0;

               /**
                * @brief Initializes font bank
                */
               this.init = function()
               {
                   var freeSansFont = this.addFont(FreeSansData);
                   this.addFont(FreeSerifData);

                   // set free sans font as default
                   this.defaultFont = freeSansFont;
               };

               /**
                * @brief Font font data to font bank
                */
               this.addFont = function(fontData)
               {
                   var addedFont = new FontData(this.oneFontLoaded.bind(this));
                   addedFont.init(fontData);
                   this.fonts[addedFont.name] = addedFont;
                   this.totalRequestedFontCount++;

                   return addedFont;
               };

               /**
                * @brief Callback function to call when a font image data is loaded
                */
               this.oneFontLoaded = function()
               {
                   this.totalLoadedFontCount++;

                   if(this.totalLoadedFontCount == this.totalRequestedFontCount)
                   {
                       // all fonts are loaded!
                       this.fontLoadedCallback();
                   }
               };

               /**
                * @brief Returns default font
                * @returns {undefined|*}
                */
               this.getDefaultFont = function()
               {
                   return this.defaultFont;
               };

               /**
                * Find the most suitable font for this node
                * @param node
                */
               this.getFont = function(node)
               {
                   var family = node.getProp('fontFamily');
                   var fonts = family.split(',');
                   var resultFont;
                   for(var i=0; i<fonts.length; i++)
                   {
                       var name = normalizeFontName(fonts[i]);
                       var tempFont = this.fonts[name];
                       if(tempFont !== undefined)
                       {
                           resultFont = tempFont;
                           break;
                       }
                   }

                   if(resultFont === undefined)
                   {
                       resultFont = this.getDefaultFont();
                   }

                   return resultFont;
               };

           }

           return FontBank;
       });
