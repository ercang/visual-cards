define([],
       function () {
           'use strict';

           /**
            * @class Text Utility Class
            */
           function TextUtility() {

               /**
                * @brief Returns the smallest power of two value for the given parameter
                * @param value
                * @param pow This parameter is used by recursive calls. Should be undefined on the first call.
                * @returns {*|number}
                */
               this.getPowerOfTwo = function(value, pow) {
                   var pow = pow || 1;
                   while(pow<value) {
                       pow *= 2;
                   }
                   return pow;
               };

               /**
                * @brief Creates an offscreen canvas element and draws text on that canvas
                * according to the given parameters
                * @param text Text string
                * @param color Color string for text color
                * @param fontSize font size in pixels
                * @param fontFamily font family string
                * @param powerOfTwoOutput true if output canvas dimensions should be power of two
                * @param lineWidth line width for wrapping text. If lineWidth is more than 0 then
                * text will break into lines
                * @param fontWeight font weight
                * @returns {Element}
                */
               this.createTextCanvas = function(text, color, fontSize, fontFamily, powerOfTwoOutput, lineWidth, fontWeight)
               {
                   //lineWidth = undefined;
                   var offScreenCanvas = document.createElement('canvas');
                   var context = offScreenCanvas.getContext('2d');
                   context.fillStyle = color;
                   context.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;


                   var textLines = [];
                   var textHeight = fontSize;

                   if (lineWidth !== undefined && lineWidth > 0 && context.measureText(text).width > lineWidth ) {
                       lineWidth = this.createMultiLineText(context, text, lineWidth, textLines);
                       if(powerOfTwoOutput) {
                           offScreenCanvas.width = this.getPowerOfTwo(lineWidth);
                       } else {
                           offScreenCanvas.width = lineWidth;
                       }
                   } else {
                       textLines.push(text);
                       if(powerOfTwoOutput) {
                           offScreenCanvas.width = this.getPowerOfTwo(context.measureText(text).width);
                       } else {
                           offScreenCanvas.width = context.measureText(text).width;
                       }
                   }

                   if(powerOfTwoOutput) {
                       offScreenCanvas.height = this.getPowerOfTwo(textHeight * (textLines.length + 1));
                   } else {
                       offScreenCanvas.height = textHeight * (textLines.length + 1);
                   }

                   context.fillStyle = color;
                   context.textBaseline = 'bottom'; // top, middle, bottom
                   context.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;

                   var textX = 0;
                   var textY = fontSize;

                   for(var i = 0; i < textLines.length; i++)
                   {
                       textY = (i+1)*textHeight;
                       context.fillText(textLines[i], textX,  textY);
                   }

                   //document.body.appendChild(offScreenCanvas);
                   return offScreenCanvas;
               };

               /**
                * @brief This function is used internally. Splits textToWrite string into lines and pushes it to 'text'
                * array.
                * @param ctx Context is the canvas.context
                * @param textToWrite Text that should be written to the canvas
                * @param maxWidth max width of one line
                * @param text this should be an empty array which will be filled by this function. Each item represents
                * one line
                * @returns {number} Returns max width of one line
                */
               this.createMultiLineText = function(ctx, textToWrite, maxWidth, text) {
                   textToWrite = textToWrite.replace('\n', ' ');
                   var currentText = textToWrite;
                   var futureText;
                   var subWidth = 0;
                   var maxLineWidth = 0;

                   var wordArray = textToWrite.split(" ");
                   var wordsInCurrent, wordArrayLength;
                   wordsInCurrent = wordArrayLength = wordArray.length;

                   // Reduce currentText until it is less than maxWidth or is a single word
                   // futureText var keeps track of text not yet written to a text line
                   while (ctx.measureText(currentText).width > maxWidth && wordsInCurrent > 1) {
                       wordsInCurrent--;
                       var linebreak = false;

                       currentText = futureText = "";
                       for(var i = 0; i < wordArrayLength; i++) {
                           if (i < wordsInCurrent) {
                               currentText += wordArray[i];
                               if (i+1 < wordsInCurrent) { currentText += " "; }
                           }
                           else {
                               futureText += wordArray[i];
                               if(i+1 < wordArrayLength) { futureText += " "; }
                           }
                       }
                   }
                   text.push(currentText); // Write this line of text to the array
                   maxLineWidth = ctx.measureText(currentText).width;

                   // If there is any text left to be written call the function again
                   if(futureText) {
                       subWidth = this.createMultiLineText(ctx, futureText, maxWidth, text);
                       if (subWidth > maxLineWidth) {
                           maxLineWidth = subWidth;
                       }
                   }

                   // Return the maximum line width
                   return maxLineWidth;
               };
           }

           return TextUtility;
       });
