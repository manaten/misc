"use strict";
/**
 * The class handle image pixels
 */
var PixelUtil = (function() {
	/**
	 * constructor
	 */
	var PixelImage = function(url, byteData) {
		this.url = url;
		this.byteData = byteData;
		this.palette = null;
		this.colorDepth = 0;
	};
	
	/**
	 * Return the byte size of image.
	 */
	PixelImage.prototype.getFileSize = function() {
		return this.byteData.length;
	};

	/**
	 * Return true when image is png otherwise false.
	 */
	PixelImage.prototype.isPng = function() {
		var src = this.byteData;
		return (src.length > 24)
			&& src[0]===0x89 && src[1]===0x50 && src[2]===0x4E && src[3]===0x47
			&& src[4]===0x0D && src[5]===0x0A && src[6]===0x1A && src[7]===0x0A;
	};

	/**
	 * Return true when image is git otherwise false.
	 */
	PixelImage.prototype.isGif = function() {
		var src = this.byteData;
		return src.length > 22 && src[0]===0x47 && src[1]===0x49 && src[2]===0x46;
	};

	/**
	 * Get the width of image.
	 */
	PixelImage.prototype.getWidth = function() {
		var src = this.byteData;
		var width = 0;
		if (this.isPng()) {
			width += src[16] << 24;
			width += src[17] << 16;
			width += src[18] << 8;
			width += src[19];
		} else if (this.isGif()) {
			width += src[7] << 8;
			width += src[6];
		}
		return width;
	};

	/**
	 * Get the height of image.
	 */
	PixelImage.prototype.getHeight = function() {
		var src = this.byteData;
		var height = 0;
		if (this.isPng()) {
			height += src[20] << 24;
			height += src[21] << 16;
			height += src[22] << 8;
			height += src[23];
		} else if (this.isGif()) {
			height += src[9] << 8;
			height += src[8];
		}
		return height;
	};

	var toHexString = function(num) {
		return (num < 0x10 ? "0" : "") + num.toString(16);
	};

	var getPaletteFromSource = function(src, colorDepth, offset) {
		var size = colorDepth * colorDepth;
		if (offset + size * 3 > src.length) {
			throw "Illigal image file.: " + this.url;
		}
		var palette = new Array(size);
		for(var i = 0; i < size; i++) {
			var red   = src[i*3+offset];
			var green = src[i*3+offset+1];
			var blue  = src[i*3+offset+2];
			palette[i] = toHexString(red) + toHexString(green) + toHexString(blue);
		}
		return palette;
	};

	var getPngPalette = function() {
		var src = this.byteData;
		var colorDepth = src[24];
		var offset = 8;
		if (src[25] === 3) {
			// seek a chank of 'PLTE'
			while (offset < src.length) {
				if ((src[offset+4] === 0x50)    // P
				 && (src[offset+5] === 0x4C)    // L
				 && (src[offset+6] === 0x54)    // T
				 && (src[offset+7] === 0x45)) { // E
					offset += 8;
					break;
				}
				offset += 12 + (src[offset]<<24) + (src[offset+1]<<16) + (src[offset+2]<<8) + (src[offset+3]);
			}
		} else {
			throw "Png file is not a indexed image.: " + this.url;
		}
		this.colorDepth = colorDepth;
		return getPaletteFromSource(src, colorDepth, offset);
	};

	var getGifPalette = function() {
		var src = this.byteData;
		var colorDepth = 0;
		var offset = 13;
		var gctf = (src[10]>>7) & 0x1;
		if (gctf === 1) {
			colorDepth = (src[10] & 0x7) + 1;
		} else {
			// if gif file not has gct, seeking first lct and get offset to there.
			while (offset < src.length) {
				if (src[offset] === 0x2c) {
					colorDepth = (src[offset + 9] & 0x7) + 1;
					offset += 10;
					break;
				} else if (src[offset] === 0x21) {
					if (src[offset + 1] === 0xf9) {
						// Graphic Control Extension
						offset += 8;
					} else if (src[offset + 1] === 0xfe) {
						// Comment Extension
						offset += 2;
						while (src[offset] !== 0) {
							offset += src[offset] + 1;
						}
						offset += 1;
					} else if (src[offset + 1] === 0x01) {
						// Plain Text Extension
						offset += 15;
						while (src[offset] != 0) {
							offset += src[offset] + 1;
						}
						offset += 1;
					} else if (src[offset + 1] === 0xff) {
						// Application Extension
						offset += 14;
						while (src[offset] != 0) {
							offset += src[offset] + 1;
						}
						offset += 1;
					} else {
						throw "Unsupported GIF file.: " + this.url;
					}
				} else {
					throw "Unsupported GIF file.: " + this.url;
				}
			}
		}
		this.colorDepth = colorDepth;
		return getPaletteFromSource(src, colorDepth, offset);
	};

	/**
	 * Get the palette array of image.
	 */
	PixelImage.prototype.getPalette = function() {
		// momerize
		if (this.palette !== null) {
			return this.palette;
		}
		if (this.isPng()) {
			return getPngPalette.apply(this, []);
		} else if (this.isGif()) {
			return getGifPalette.apply(this, []);
		}
		throw "File is not PNG or GIF.: " + this.url;
	};

	var PixelUtil = {};
	var getXmlHttpObject = function() {
		var xhr;
		if (XMLHttpRequest) {
			xhr = new XMLHttpRequest();
		} else {
			xhr = new ActiveXObject('MSXML2.XMLHTTP.6.0');
		}
		return xhr;
	};
	/**
	 * convert text to byte array.
	 */
	var textToByteArray = function(text) {
		var byteArray = new Array(text.length);
		for (var i = 0; i < text.length; i++) {
			byteArray[i] = text.charCodeAt(i) & 0xff;
		}
		return byteArray;
	};
	/**
	 * load image and get informations of image.
	 * @param String url The url of image.
	 * @param function callback
	 *      The function called after load.
	 *      It's first argument is object contains informations of image. 
	 */
	PixelUtil.load = function(url, callback) {
		var request = getXmlHttpObject();
		request.open('GET', url, true);
		request.overrideMimeType('text\/plain; charset=x-user-defined');
		request.onload = function() {
			if (request.status != 200) {
				throw "Couldn't load image: " + url;
			}
			var byteData = textToByteArray(request.responseText);
			var img = new PixelImage(url, byteData);
			// call callback with informations of image.
			callback({
				url: url,
				fileSize:   img.getFileSize(),
				width:      img.getWidth(),
				height:     img.getHeight(),
				isGif:      img.isGif(),
				isPng:      img.isPng(),
				palette:    img.getPalette(),
				colorDepth: img.colorDepth
			});
		};
		request.send(null);
	};
	return PixelUtil;
})();