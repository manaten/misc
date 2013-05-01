// ==UserScript==
// @name        PixelTip
// @namespace   http://manaten.net
// @description 特定のページで画像にドット絵向けTipを表示します。
// @include     http://www.pixeljoint.com/*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require     https://raw.github.com/manaten/misc/master/pixel_util/pixel_util.js
// @resource    PixelTip https://raw.github.com/manaten/misc/master/pixel_util/pixel_tip.css
// @version     1
// @grant       GM_addStyle
// @grant       GM_getResourceText
// ==/UserScript==

$(function() {
  GM_addStyle(GM_getResourceText("PixelTip"));
  $('img').each(function(_, img) {
    var $img = $(img);
    var tip = PixelUtil.createTip($img.attr('src'));
    $img.hover(function() {
      var pos = $img.offset();
      tip.show(pos.left-10, pos.top-10);
    }, null);
  });
});