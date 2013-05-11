"use strict";
/**
 * A util class of pixel art.
 */
var PixelUtil = (function() {
	/**
	 * The class handle image pixels
	 */
	var PixelImage = function() {
		var PixelImage = function(url, byteData) {
			this.url  = url;
			this.name = url.split('/').pop();
			this.byteData = byteData;
			this.palette = null;
			this.colorDepth = 0;

			// Set propaties from private methods.
			this.isGif    = isGif.apply(this);
			this.isPng    = isPng.apply(this);
			this.fileSize = getFileSize.apply(this);
			this.width    = getWidth.apply(this);
			this.height   = getHeight.apply(this);
			this.palette  = getPalette.apply(this);
			this.colorNum = uniq(this.palette).length;
		};

		var unique = function(array) {
			var _a = array.sort();
			var result = [];
			for (var i = 0; i < _a.length; i++) {
				if (_a[i-1]) {
					(_a[i-1] !== _a[i]) && result.push(_a[i]);
				} else {
					result.push(_a[i]);
				}
			}
			return result;
		};
		
		/**
		 * Return the byte size of image.
		 */
		var getFileSize = function() {
			return this.byteData.length;
		};

		/**
		 * Return true when image is png otherwise false.
		 */
		var isPng = function() {
			var src = this.byteData;
			return (src.length > 24)
				&& src[0]===0x89 && src[1]===0x50 && src[2]===0x4E && src[3]===0x47
				&& src[4]===0x0D && src[5]===0x0A && src[6]===0x1A && src[7]===0x0A;
		};

		/**
		 * Return true when image is git otherwise false.
		 */
		var isGif = function() {
			var src = this.byteData;
			return src.length > 22 && src[0]===0x47 && src[1]===0x49 && src[2]===0x46;
		};

		/**
		 * Get the width of image.
		 */
		var getWidth = function() {
			var src = this.byteData;
			var width = 0;
			if (isPng.apply(this)) {
				width += src[16] << 24;
				width += src[17] << 16;
				width += src[18] << 8;
				width += src[19];
			} else if (isGif.apply(this)) {
				width += src[7] << 8;
				width += src[6];
			}
			return width;
		};

		/**
		 * Get the height of image.
		 */
		var getHeight = function() {
			var src = this.byteData;
			var height = 0;
			if (isPng.apply(this)) {
				height += src[20] << 24;
				height += src[21] << 16;
				height += src[22] << 8;
				height += src[23];
			} else if (isGif.apply(this)) {
				height += src[9] << 8;
				height += src[8];
			}
			return height;
		};

		var toHexString = function(num) {
			return (num < 0x10 ? "0" : "") + num.toString(16);
		};

		var getPaletteFromSource = function(src, colorDepth, offset) {
			var size = Math.pow(2, colorDepth);
			if (offset + size * 3 > src.length) {
				return [];
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
				return [];
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
						return [];
						}
					} else {
						return [];
					}
				}
			}
			this.colorDepth = colorDepth;
			return getPaletteFromSource(src, colorDepth, offset);
		};

		/**
		 * Get the palette array of image.
		 */
		var getPalette = function() {
			// momerize
			if (this.palette !== null) {
				return this.palette;
			}
			if (isPng.apply(this)) {
				return getPngPalette.apply(this);
			} else if (isGif.apply(this)) {
				return getGifPalette.apply(this);
			}
			throw "File is not PNG or GIF.: " + this.url;
		};
		return PixelImage;
	}();


	/**
	 * A tip class
	 */
	var PixelTip =  function() {
		var PixelTip = function(url) {
			this.url = url;
			this.bgcolor = 0;
			this.zoomLevel = 1;
			this.visible = false;
		};

		var createTip = function(x, y) {
			var that = this;
			var $tip = $("<div class='pixelTip'></div>")
				.css({ position:"absolute" })
				.hide()
				.hover(null, function() { that.hide(); } )
				.appendTo(document.body);
			var $img = $("<img src='" + that.url + "'>")
				.css({ "background-color": bgcolors[0] });
			that.$tip = $tip;
			that.$img = $img;

			PixelUtil.load(that.url, function(imgInfo) {
				var $controll = $("<div class='controll'>" + imgInfo.name + "</div>");
				$('<button class="zoomIn" type="button">+</button>')
					.click( function() { zoomIn.apply(that) } ).appendTo($controll);
				$('<button class="zoomOut" type="button">-</button>')
					.click( function() { zoomOut.apply(that) } ).appendTo($controll);
				$('<button class="bgColor" type="button">[ ]</button>')
					.click( function() { changeBGColor.apply(that) } ).appendTo($controll);
				$('<button class="flip" type="button">&lt;-&gt;</button>')
					.click( function() { flipImage.apply(that) } ).appendTo($controll);


				$tip.append($controll)
					.append($('<div class="container"></div>').append($img))
					.append($("<div class='info'>" +
						"<span class='width'>" + imgInfo.width + "</span>" +
						"<span class='height'>" + imgInfo.height + "</span>" +
						"<span class='size'>" + imgInfo.fileSize + "</span>" +
						"<span class='colorNum'>" + imgInfo.colorNum + "</span>" +
						"<span class='depth'>" + imgInfo.colorDepth + "</span></div>"));
				appendPaletteTable.apply(that, [$tip, imgInfo.palette]);

				that.baseWidth  = $img.attr("width")  || imgInfo.width;
				that.baseHeight = $img.attr("height") || imgInfo.height;
				that.visible && that.show(x, y);
			});
		};

		var appendPaletteTable = function($tip, palette) {
			if (palette.length === 0) {
				return;
			}
			var that = this;
			var $colorDiv = $('<div class="color">#000000</div>');
			var $table = $("<table class='palette'></table>");
			for (var y = 0; y < 16; y++) {
				var $tr = $("<tr></tr>");
				for (var x = 0; x < 16; x++) {
					var offset = x + y * 16;
					(function() {
						if (offset >= palette.length) {
							return;
						}
						var color = "#" + palette[offset];
						$("<td></td>")
							.css({ "background-color": color })
							.mouseover(function() { $colorDiv.text(color).css({ "border-color":color }); })
							.click(function() { changeBGColor.apply(that, [color]); })
							.appendTo($tr);
					})();
				}
				$tr.children().size() && $table.append($tr);
			}
			$tip.append($table).append($colorDiv);
		};

		var bgcolors = ["#FFF", "#FCC", "#CFC", "#CCF", "#F33", "#3F3", "#33F", "#FF3", "#3FF", "#F3F", "#000"];
		var changeBGColor = function(color) {
			if (!color) {
				this.bgcolor = this.bgcolor >= bgcolors.length-1 ? 0 : this.bgcolor+1;
				color = bgcolors[this.bgcolor];
			} else {
				this.bgcolor = -1;
			}
			this.$img.css("background-color", color);
		};

		var zoomIn = function() {
			this.zoomLevel = this.zoomLevel < 8 ? this.zoomLevel*2 : this.zoomLevel;
			fixSize.apply(this);
		};

		var zoomOut = function() {
			this.zoomLevel = this.zoomLevel > 1 ? this.zoomLevel/2 : this.zoomLevel;
			fixSize.apply(this);
		};

		var fixSize = function() {
			this.$img
				.attr("width", this.baseWidth*this.zoomLevel+"px")
				.attr("height", this.baseHeight*this.zoomLevel+"px");
		};

		var flipImage = function() {
			this.$img.toggleClass("flip");
		};

		PixelTip.prototype.show = function(x, y) {
			this.visible = true;
			if (!this.$tip) {
				createTip.apply(this, [x, y]);
			} else {
				this.$tip.css({ "left":x+"px", "top":y+"px" }).show();
			}
		};
		PixelTip.prototype.hide = function() {
			this.visible = false;
			this.$tip && this.$tip.hide();
		};
		return PixelTip;
	}();

	var PixelUtil = {};
	var getXmlHttpObject = function() {
		return XMLHttpRequest ?  new XMLHttpRequest() : new ActiveXObject('MSXML2.XMLHTTP.6.0');
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
		request.overrideMimeType && request.overrideMimeType('text\/plain; charset=x-user-defined');
		request.onload = function() {
			if (request.status != 200) {
				throw "Couldn't load image: " + url;
			}
			var byteData = textToByteArray(request.responseText);
			callback(new PixelImage(url, byteData));
		};
		request.send(null);
	};

	/**
	 * Create a tip of image.
	 * When mouce hover to image, show a tip of image.
	 * this method can't work without jQuery
	 */
	PixelUtil.createTip = function(url) {
		return new PixelTip(url);
	};

	return PixelUtil;
})();
