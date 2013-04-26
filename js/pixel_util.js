"use strict";
/**
 * The class handle image pixels
 */
var PixelUtil = (function() {
	/**
	 * constructor
	 * @param String url   The url of image
	 */
	var PixelUtil = function(url) {
		this.url = url;
		this.byteData = [];
		this.palette = null;
		this.colorDepth = 0;
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
	 * load image bytes.
	 * @param function callback   The function called after load.
	 */
	PixelUtil.prototype.load = function(callback) {
		var that = this;
		var request = new XMLHttpRequest();
		request.open('GET', this.url, true);
		request.overrideMimeType('text\/plain; charset=x-user-defined');
		request.onload = function() {
			if (request.status != 200) {
				throw new Exception("Can't load image: " + this.url);
			}
			that.byteData = request.responseText;
			callback && callback();
		};
		request.send(null);
	};

	PixelUtil.prototype.getFileSize = function() {
		return this.byteData.length;
	};

	PixelUtil.prototype.isPng = function() {
		var src = this.byteData;
		return src.length > 24
			&& src[0]===0x89 && src[1]===0x50 && src[2]===0x4E && src[3]===0x47
			&& src[4]===0x0D && src[5]===0x0A && src[6]===0x1A && src[7]===0x0A;
	};

	PixelUtil.prototype.isGif = function() {
		var src = this.byteData;
		return src.length > 22 && src[0]===0x47 && src[1]===0x49 && src[2]===0x46;
	};

	PixelUtil.prototype.getWidth = function() {
		var src = this.byteData;
		var width = 0;
		if (isPNG()) {
			width += src[16] << 24;
			width += src[17] << 16;
			width += src[18] << 8;
			width += src[19];
		} else if (isGIF()) {
			width += src[7] << 8;
			width += src[6];
		}
		return width;
	};

	PixelUtil.prototype.getHeight = function() {
		var src = this.byteData;
		var height = 0;
		if (isPNG()) {
			height += src[20] << 24;
			height += src[21] << 16;
			height += src[22] << 8;
			height += src[23];
		} else if (isGIF()) {
			height += src[9] << 8;
			height += src[8];
		}
		return height;
	};

	var getPaletteFromSource = function(src, colorDepth, offset) {
		var size = colorDepth * colorDepth;
		if (offset + size * 3 > src.length) {
			throw new Exception("Illigal image file.: " + this.url);
		}
		var palette = new Array(size);
		for(var i = 0; i < size; i++) {
			var red   = src[i*3+offset];
			var green = src[i*3+offset+1];
			var blue  = src[i*3+offset+2];
			palette[i] = (red<<16).toString(16) + (green<<8).toString(16) + blue.toString(16);
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
				if (src[offset+4] === 0x50)    // P
				&& (src[offset+5] === 0x4C)    // L
				&& (src[offset+6] === 0x54)    // T
				&& (src[offset+7] === 0x45)) { // E
					offset += 8;
					break;
				}
				offset += 12 + (src[offset]<<24) + (src[offset+1]<<16) + (src[offset+2]<<8) + (src[offset+3]);
			}
		} else {
			throw new Exception("Png file is not a indexed image.: " + this.url);
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
						throw new Exception("Unsupported GIF file.: " + this.url);
					}
				} else {
					throw new Exception("Unsupported GIF file.: " + this.url);
				}
			}
		}
		this.colorDepth = colorDepth;
		return getPaletteFromSource(src, colorDepth, offset);
	};

	PixelUtil.prototype.getPalette = function() {
		// momerize
		if (this.palette !== null) {
			return this.palette;
		}
		if (isPNG()) {
			return getPngPalette.apply(this, []);
		} else if (isGIF()) {
			return getGifPalette.apply(this, []);
		}
		throw new Exception("File is not PNG or GIF.: " + this.url);
	};
	return PixelUtil;
})();