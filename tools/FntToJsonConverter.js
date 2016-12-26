/**
 * Fnt to JSon Converter
 * This tool was written for Hiero bitmap font tool. Hiero outputs a 'fnt' and a 'png' file, this tool converts 'fnt'
 * file to a require js compatible javascript file. So it can be read later by VisualCards.js
 *
 * https://github.com/libgdx/libgdx/wiki/Hiero
 *
 */

var fs = require('fs');

console.log('------------------------------------------------------------');
console.log('*** Fnt to Json Converter ');
console.log('------------------------------------------------------------');

var argCount = process.argv.length;
if(argCount != 3)
{
    console.log('Wrong argument count!');
    console.log('Usage: node FntToJsonConverter.js [filename]');
    console.log('       node FntToJsonConverter.js "../assets/FreeSans.fnt"');
    process.exit(1);
}

var filePath = process.argv[2];

fs.readFile(filePath, 'utf8', function(err, data) {
    if (err)
    {
        console.log('Error: Can not open requested file! "' + filePath + '"\n');
        process.exit(1);
    }
    console.log('File is read. "' + filePath + '"');
    processFntFile(data);
});

function extractValue(str, keyName)
{
    var searchString = keyName + '=';
    var startIndex = str.indexOf(searchString);
    if(startIndex === -1)
    {
        return undefined;
    }

    startIndex += searchString.length;
    var endIndex = str.indexOf(' ', startIndex);
    if(endIndex === -1)
    {
        endIndex = str.length;
    }

    var val = str.substring(startIndex, endIndex);
    if(val.length === 0)
    {
        return '';
    }

    // check if this is a string
    if(val.charAt(0) === '"' || val.charAt(0) === '\'')
    {
        // this is a string
        endIndex = str.indexOf(val.charAt(0), startIndex+1);
        return str.substring(startIndex+1, endIndex);
    }

    // check if this is a comma separated value
    var commaIndex = val.indexOf(',');
    if(commaIndex !== -1)
    {
        // string has commas, split them
        var splittedVals = val.split(',');
        var result = [];
        for(var i=0; i<splittedVals.length; i++)
        {
            result.push(parseInt(splittedVals[i]));
        }

        return result;
    }

    // check if this is a number
    var intVal = parseInt(val);
    if(intVal !== NaN)
    {
        return intVal;
    }

    return undefined;
}


function processFntFile(contents)
{
    console.log("Processing file...");

    var lines = contents.split('\n');
    /**
     * Process header
     *
     * info face="FreeSans" size=32 bold=0 italic=0 charset="" unicode=0 stretchH=100 smooth=1 aa=1 padding=1,1,1,1 spacing=-2,-2
     * common lineHeight=39 base=31 scaleW=256 scaleH=256 pages=1 packed=0
     * page id=0 file="FreeSans.png"
     * chars count=97
     */

    var fontData = {};

    fontData.name = extractValue(lines[0], 'face');
    fontData.size = extractValue(lines[0], 'size');
    fontData.bold = extractValue(lines[0], 'bold') === 0 ? false : true;
    fontData.italic = extractValue(lines[0], 'italic') === 0 ? false : true;
    fontData.charset = extractValue(lines[0], 'charset');

    fontData.lineHeight = extractValue(lines[1], 'lineHeight');
    fontData.base = extractValue(lines[1], 'base');
    fontData.imageSize = [extractValue(lines[1], 'scaleW'), extractValue(lines[1], 'scaleH')];

    fontData.fileName = extractValue(lines[2], 'file');

    // read chars
    var charCount = extractValue(lines[3], 'count');
    fontData.charCount = charCount;

    // print header info
    console.log('------------------------------------------------------------');
    console.log('Font Name: ' + fontData.name);
    console.log('Font Size: ' + fontData.size);
    console.log('Bold: ' + fontData.bold + ', Italic: ' + fontData.italic + ' Charset: "' + fontData.charset + '"');
    console.log('Base: ' + fontData.base + ', Line Height: ' + fontData.lineHeight);
    console.log('Image Size: ' + fontData.imageSize[0] + 'x' + fontData.imageSize[1]);
    console.log('File Name: ' + fontData.fileName);
    console.log('Char Count: ' + fontData.charCount);
    console.log('------------------------------------------------------------');

    if(charCount === undefined || charCount === NaN || typeof charCount != "number")
    {
        console.log('Parsing error, charCount: ' + charCount);
        process.exit(1);
    }

    // read all chars
    fontData.chars = [];
    for(var i=0; i<charCount; i++)
    {
        var currentLine = lines[4+i];

        var ch = {};
        ch.id = extractValue(currentLine, 'id');
        ch.x = extractValue(currentLine, 'x');
        ch.y = extractValue(currentLine, 'y');
        ch.width = extractValue(currentLine, 'width');
        ch.height = extractValue(currentLine, 'height');
        ch.xOffset = extractValue(currentLine, 'xoffset');
        ch.yOffset = extractValue(currentLine, 'yoffset');
        ch.xAdvance = extractValue(currentLine, 'xadvance');

        fontData.chars.push(ch);
    }

    var kerningStartIndex = 4 + charCount;
    var kerningCount = extractValue(lines[kerningStartIndex], 'count');
    fontData.kerningCount = kerningCount;
    // read all chars
    fontData.kernings = [];
    for(var i=0; i<charCount; i++)
    {
        var currentLine = lines[kerningStartIndex+i+1];

        var kerning = {};
        kerning.first = extractValue(currentLine, 'first');
        kerning.second = extractValue(currentLine, 'second');
        kerning.amount = extractValue(currentLine, 'amount');

        fontData.kernings.push(kerning);
    }

    // write output to file
    var splittedFilePath = filePath.split('.');
    var outputFilename = '';
    for(var i=0; i<splittedFilePath.length-1; i++)
    {
        outputFilename += splittedFilePath[i] + '.';
    }

    var outputJsFilename = outputFilename;
    outputFilename += 'json';
    outputJsFilename += 'js';

    console.log('Saving output to ' + outputFilename);
    fs.writeFile(outputFilename, JSON.stringify(fontData), function(err) {
        if(err) {
            console.log("Error occured while saving file " + outputFilename);
            console.log(err);
        } else {
            console.log("File saved to " + outputFilename);
        }
    });

    // create js file
    var output = 'define(function () {var fontData = ' + JSON.stringify(fontData) + '; return fontData;});';
    console.log('Saving output to ' + outputJsFilename);
    fs.writeFile(outputJsFilename, output, function(err) {
        if(err) {
            console.log("Error occured while saving file " + outputJsFilename);
            console.log(err);
        } else {
            console.log("File saved to " + outputJsFilename);
        }
    });
}