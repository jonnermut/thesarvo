function a(i)
{
	document.write("\n<tr><td width='99%' >");
	document.write("<a name='guide.id." + i + "' ></a>");
}


function b(i,p)
{

	document.write("<a title='Click to edit this content' href='" + document.location.pathname + "?guide.action=edit&guide.id=" + i + "&guide.page="+p+"#guide.id." + i + "'>");
	document.write("<img border=0 src='");
	document.write( "../../images/icons/edit_only_16.gif" );
	document.write("' />");
	document.write("</a>");
	document.write("<a title='Click to delete this content' href='" + document.location + "?guide.action=delete&guide.id=" + i + "&guide.page="+p+"#guide.id." + i + "'>");
	document.write("<img border=0 title='Click to delete this content' src='");
	document.write( "../../images/icons/trash_16.gif" );
	document.write("' />");
	document.write("</a>");


}

function c(i,p)
{
	document.write("\n<tr><td align='right'>");
	document.write("<select style='display:none' id='guideinsert" + i + "' ");
	document.write(" ONCHANGE=\"if (this.options[this.selectedIndex].value!='') location = '" + document.location + "?guide.action=insert&guide.page=" + p + "&guide.id=" + i + "&guide.type='+this.options[this.selectedIndex].value + '#guide.id." + (i+1) + "';\" >");
	document.write("<option value='' >Insert...</option>");
	document.write("<option value='text' >Insert Text</option>");
	document.write("<option value='image' >Insert Image</option>");
	document.write("<option value='problem' >Insert Problem</option>");
	document.write("<option value='climb' >Insert Climb</option>");
	document.write("</select>");
	document.write("</td><td>");

	document.write("\n<img border=0 title='Click to insert a climb,problem,text or image' style='cursor:pointer' src='");
	document.write( "../../images/icons/plus.gif" );
	document.write("' onclick=\"document.getElementById('guideinsert" + i + "').style['display']='inline';\"  />");

	document.write("</td></tr>");
}

var editid = null;
var edithtml = null;
var editelem = null;

var errorText="Error talking to server. Maybe youve got an old browser? This application needs IE 5.5+ or Firefox/Mozilla 1+. Please contact jon@thesarvo.com and describe the problem: ";

function edit(i)
{


	try
	{
		var elem = xGetElementById('guide.div.' + i);

		if (elem)
		{
			window.status='start edit';

			if (elem)
			{

				if (editelem!=null)
					editelem.innerHTML = edithtml;

				edithtml = elem.innerHTML;

				showPleaseWait(elem);

				var newHtml = jsonrpc.guideMacro.edit(i);

				//window.status='edit returned:' + newHtml;

				editid = i;
				editelem = elem;

				elem.innerHTML=newHtml;
			}
			window.status='edit finished';
		}

	//alert('alert');
	}
	catch (e)
	{
		alert(errorText + "\n" + e + "\n" + e.trace);
		reloadPage();
	}
	hidePleaseWait();


}




function saveEdit(i, afterInsert)
{

	window.status='start save';
	var newHtml;

	var a=new Object();
	a.map=new Object();
	a.javaClass = "java.util.HashMap";

	//a.map[o.id] = o.value;

	try
	{
		var form = document.forms['guide_edit_form'];
		if (form)
		{
			for(var index=0;index< form.elements.length ; index++)
			{
				var o = form.elements[index];

				if (o!=null && o.tagName)
				{
					if ( o.tagName.toUpperCase()!="INPUT" || o.type.toUpperCase()!="SUBMIT" )
					{
						if(o.name)
						{
							if(o.type == "checkbox")
							{
								if (o.checked)
								{
									a.map[o.name] = "true";
									//if (debugmap)
									//	alert("(" + o.type + ") value:" + o.value + " checked:" + o.checked);
								}
								else
									a.map[o.name] = "false";
							}
							else
							{
								a.map[o.name] = o.value;
								//if (debugmap)
								//	alert("(" + o.type + ") value:" + o.value);
							}
						}

						//no id on the control
						else if(o.type == "checkbox" && o.checked)
						{
							//checkbox's have no id.
							a.map[o.name] = o.value;
							//if (debugmap)
							//	alert("(cb) value:" + o.value + " checked:" + o.checked);
						}
					}
				}
			}

			if (editelem)
				showPleaseWait(editelem);

			newHtml = jsonrpc.guideMacro.save(i,afterInsert,a);
		}

		if (editelem)
		{
			editelem.innerHTML=newHtml;

			edithtml = null;
			editid = null;
			editelem = null;
		}
	}
	catch (e)
	{
		alert(errorText + e + "\n" + e.trace);
		reloadPage();
	}
	//window.status='save returned:' + newHtml;

	//alert('alert');
	hidePleaseWait();
	//var elem = xGetElementById('guide.div.' + i);




	window.status='save finished';

}

function getFormElement(form,name)
{
	var el = form.elements[name];
	if (el)
	{
		var ret = null;
		if (el.options)
		{
			ret = el.options[el.selectedIndex].value;
		}
		else
		{
			if (el.type == "checkbox")
				ret = el.checked ? "true" : "false";
			else
				ret = el.value;
		}

		if (ret==null)
			ret = 'null';

		return ret;
	}
	return 'null';
}


function remove(i)
{
	cancelEdit();

	window.status='start remove';
	try
	{
		var elem = xGetElementById('guide.div.' + i);
		showPleaseWait(elem);

		jsonrpc.guideMacro.remove(i);



		if (elem)
		{
			elem.innerHTML = ' ';
			//elem.style='';
			elem.style.border='none';

            if (elem.nextSibling)
                elem.nextSibling.innerHTML = ' ';

		}
	}
	catch (e)
	{
		alert(errorText + e + "\n" + e.trace);
		reloadPage();
	}

	hidePleaseWait();
	window.status='remove finished';

}

function insert(i,type)
{
	cancelEdit();

	window.status='start insert';
	var html ;
	try
	{
		var elem = document.getElementById('guide.insert.' + i);




		if (elem)
		{
			edithtml = elem.innerHTML;

			showPleaseWait(elem);

			html = jsonrpc.guideMacro.insert(i,type);



			editid = i;
			editelem = elem;

			elem.innerHTML = html;
		}
	}
	catch (e)
	{
		alert(errorText + e + "\n" + e.trace);
		reloadPage();
	}
	//window.status='insert returned:' + newHtml;

	//window.status='insert returned:' + html;

	hidePleaseWait();


	//elem = xGetElementById('guide.div.' + id);
	window.status='insert finished';
}


function cancelEdit()
{

	if (editelem!=null)
		editelem.innerHTML = edithtml;
	edithtml = null;
	editid = null;
	editelem = null;

}

var plzWait = "<div id='guide.pleaseWait' style='width:90%;height:100px;text-align:center;background-color:silver;color:black;font-size:10pt;font-weight:bold;border: 2px solid gray;' ><br>Please Wait...</div>";

function showPleaseWait(e)
{
	try
	{
		//xDisplay(getPleaseWait(),'block');
		//document.body.style.cursor='wait';

		if (e && e.innerHTML)
		{
			e.innerHTML = plzWait;
		}
		//alert('wait');

	}
	catch(e)
	{}

}

function hidePleaseWait()
{
	try
	{
		xDisplay(getPleaseWait(),'none');
		document.body.style.cursor='default';

	}
	catch(e)
	{}
}

var pwElem = null;

function getPleaseWait()
{
	if (pwElem==null)
	{
		pwElem= xGetElementById('guide.pleaseWait');

//		pwElem = document.createElement("div");
//		pwElem.style.display='none';
//		pwElem.style.postition='absolute';
//		pwElem.style.left='300px';
//		pwElem.style.top='300px';
//		pwElem.style.width='200px';
//		pwElem.style.height='100px';
//		pwElem.style.border='1px solid gray';
//		pwElem.style.backgroundColor='silver';
//		pwElem.style.color='black';
//		pwElem.style.fontWeight='bold';
//		pwElem.style.textAlign='center';
//		pwElem.innerHTML='<br>Please Wait...';
		document.body.appendChild(pwElem);
	}

	var top = xScrollTop() + 200;
	xTop(pwElem,top);

	return pwElem;

}

function reloadPage()
{
    var loc = "" + document.location;
    if (loc.indexOf("#")>0)
        loc = loc.substring(0,loc.indexOf("#"));
	document.location=loc+"&t=t";
}


// x_core.js, part of X, a Cross-Browser.com Javascript Library
// Copyright (C) 2001,2002,2003,2004,2005 Michael Foster - Distributed under the terms of the GNU LGPL - OSI Certified
// File Rev: 5

var xVersion='3.15.4',xNN4,xOp7,xOp5or6,xIE4Up,xIE4,xIE5,xUA=navigator.userAgent.toLowerCase();
if (window.opera){
  xOp7=(xUA.indexOf('opera 7')!=-1 || xUA.indexOf('opera/7')!=-1);
  if (!xOp7) xOp5or6=(xUA.indexOf('opera 5')!=-1 || xUA.indexOf('opera/5')!=-1 || xUA.indexOf('opera 6')!=-1 || xUA.indexOf('opera/6')!=-1);
}
else if (document.all && xUA.indexOf('msie')!=-1) {
  xIE4Up=parseInt(navigator.appVersion)>=4;
  xIE4=xUA.indexOf('msie 4')!=-1;
  xIE5=xUA.indexOf('msie 5')!=-1;
}
else if (document.layers) {xNN4=true;}
xMoz=xUA.indexOf('gecko')!=-1;
xMac=xUA.indexOf('mac')!=-1;

function xGetElementById(e) {
  if(typeof(e)!='string') return e;
  if(document.getElementById) e=document.getElementById(e);
  else if(document.all) e=document.all[e];
  else e=null;
  return e;
}
function xParent(e,bNode){
  if (!(e=xGetElementById(e))) return null;
  var p=null;
  if (!bNode && xDef(e.offsetParent)) p=e.offsetParent;
  else if (xDef(e.parentNode)) p=e.parentNode;
  else if (xDef(e.parentElement)) p=e.parentElement;
  return p;
}
function xDef() {
  for(var i=0; i<arguments.length; ++i){if(typeof(arguments[i])=='undefined') return false;}
  return true;
}
function xStr() {
  for(var i=0; i<arguments.length; ++i){if(typeof(arguments[i])!='string') return false;}
  return true;
}
function xNum() {
  for(var i=0; i<arguments.length; ++i){if(typeof(arguments[i])!='number') return false;}
  return true;
}
function xShow(e) { return xVisibility(e, 1); }
function xHide(e) { return xVisibility(e, 0); }
function xVisibility(e, bShow)
{
  if(!(e=xGetElementById(e))) return null;
  if(e.style && xDef(e.style.visibility)) {
    if (xDef(bShow)) e.style.visibility = bShow ? 'visible' : 'hidden';
    return e.style.visibility;
  }
  return null;
}
function xDisplay(e, sProp)
{
  if(!(e=xGetElementById(e))) return null;
  if(e.style && xDef(e.style.display)) {
    if (xStr(sProp)) e.style.display = sProp;
    return e.style.display;
  }
  return null;
}
function xZIndex(e,uZ) {
  if(!(e=xGetElementById(e))) return 0;
  if(e.style && xDef(e.style.zIndex)) {
    if(xNum(uZ)) e.style.zIndex=uZ;
    uZ=parseInt(e.style.zIndex);
  }
  return uZ;
}
function xColor(e,sColor) {
  if(!(e=xGetElementById(e))) return '';
  var c='';
  if(e.style && xDef(e.style.color)) {
    if(xStr(sColor)) e.style.color=sColor;
    c=e.style.color;
  }
  return c;
}
function xBackground(e,sColor,sImage) {
  if(!(e=xGetElementById(e))) return '';
  var bg='';
  if(e.style) {
    if(xStr(sColor)) {
      if(!xOp5or6) e.style.backgroundColor=sColor;
      else e.style.background=sColor;
    }
    if(xStr(sImage)) e.style.backgroundImage=(sImage!='')? 'url('+sImage+')' : null;
    if(!xOp5or6) bg=e.style.backgroundColor;
    else bg=e.style.background;
  }
  return bg;
}
function xMoveTo(e,iX,iY) {
  xLeft(e,iX);
  xTop(e,iY);
}
function xLeft(e,iX) {
  if(!(e=xGetElementById(e))) return 0;
  var css=xDef(e.style);
  if (css && xStr(e.style.left)) {
    if(xNum(iX)) e.style.left=iX+'px';
    else {
      iX=parseInt(e.style.left);
      if(isNaN(iX)) iX=0;
    }
  }
  else if(css && xDef(e.style.pixelLeft)) {
    if(xNum(iX)) e.style.pixelLeft=iX;
    else iX=e.style.pixelLeft;
  }
  return iX;
}
function xTop(e,iY) {
  if(!(e=xGetElementById(e))) return 0;
  var css=xDef(e.style);
  if(css && xStr(e.style.top)) {
    if(xNum(iY)) e.style.top=iY+'px';
    else {
      iY=parseInt(e.style.top);
      if(isNaN(iY)) iY=0;
    }
  }
  else if(css && xDef(e.style.pixelTop)) {
    if(xNum(iY)) e.style.pixelTop=iY;
    else iY=e.style.pixelTop;
  }
  return iY;
}
function xPageX(e) {
  if (!(e=xGetElementById(e))) return 0;
  var x = 0;
  while (e) {
    if (xDef(e.offsetLeft)) x += e.offsetLeft;
    e = xDef(e.offsetParent) ? e.offsetParent : null;
  }
  return x;
}
function xPageY(e) {
  if (!(e=xGetElementById(e))) return 0;
  var y = 0;
  while (e) {
    if (xDef(e.offsetTop)) y += e.offsetTop;
    e = xDef(e.offsetParent) ? e.offsetParent : null;
  }
//  if (xOp7) return y - document.body.offsetTop; // v3.14, temporary hack for opera bug 130324 (reported 1nov03)
  return y;
}
function xOffsetLeft(e) {
  if (!(e=xGetElementById(e))) return 0;
  if (xDef(e.offsetLeft)) return e.offsetLeft;
  else return 0;
}
function xOffsetTop(e) {
  if (!(e=xGetElementById(e))) return 0;
  if (xDef(e.offsetTop)) return e.offsetTop;
  else return 0;
}
function xScrollLeft(e, bWin) {
  var offset=0;
  if (!xDef(e) || bWin) {
    var w = e || window;
    if(w.document.documentElement && w.document.documentElement.scrollLeft) offset=w.document.documentElement.scrollLeft;
    else if(w.document.body && xDef(w.document.body.scrollLeft)) offset=w.document.body.scrollLeft;
  }
  else {
    e = xGetElementById(e);
    if (e && xNum(e.scrollLeft)) offset = e.scrollLeft;
  }
  return offset;
}
function xScrollTop(e, bWin) {
  var offset=0;
  if (!xDef(e) || bWin) {
    var w = e || window;
    if(w.document.documentElement && w.document.documentElement.scrollTop) offset=w.document.documentElement.scrollTop;
    else if(w.document.body && xDef(w.document.body.scrollTop)) offset=w.document.body.scrollTop;
  }
  else {
    e = xGetElementById(e);
    if (e && xNum(e.scrollTop)) offset = e.scrollTop;
  }
  return offset;
}
function xHasPoint(ele, iLeft, iTop, iClpT, iClpR, iClpB, iClpL) {
  if (!xNum(iClpT)){iClpT=iClpR=iClpB=iClpL=0;}
  else if (!xNum(iClpR)){iClpR=iClpB=iClpL=iClpT;}
  else if (!xNum(iClpB)){iClpL=iClpR; iClpB=iClpT;}
  var thisX = xPageX(ele), thisY = xPageY(ele);
  return (iLeft >= thisX + iClpL && iLeft <= thisX + xWidth(ele) - iClpR &&
          iTop >=thisY + iClpT && iTop <= thisY + xHeight(ele) - iClpB );
}
function xResizeTo(e,uW,uH) {
  xWidth(e,uW);
  xHeight(e,uH);
}
function xWidth(e,uW) {
  if(!(e=xGetElementById(e))) return 0;
  if (xNum(uW)) {
    if (uW<0) uW = 0;
    else uW=Math.round(uW);
  }
  else uW=-1;
  var css=xDef(e.style);
  if(css && xDef(e.offsetWidth) && xStr(e.style.width)) {
    if(uW>=0) xSetCW(e, uW);
    uW=e.offsetWidth;
  }
  else if(css && xDef(e.style.pixelWidth)) {
    if(uW>=0) e.style.pixelWidth=uW;
    uW=e.style.pixelWidth;
  }
  return uW;
}
function xHeight(e,uH) {
  if(!(e=xGetElementById(e))) return 0;
  if (xNum(uH)) {
    if (uH<0) uH = 0;
    else uH=Math.round(uH);
  }
  else uH=-1;
  var css=xDef(e.style);
  if(css && xDef(e.offsetHeight) && xStr(e.style.height)) {
    if(uH>=0) xSetCH(e, uH);
    uH=e.offsetHeight;
  }
  else if(css && xDef(e.style.pixelHeight)) {
    if(uH>=0) e.style.pixelHeight=uH;
    uH=e.style.pixelHeight;
  }
  return uH;
}
function xGetCS(ele,sP){return parseInt(document.defaultView.getComputedStyle(ele,'').getPropertyValue(sP));}
function xSetCW(ele,uW){
  var pl=0,pr=0,bl=0,br=0;
  if(xDef(document.defaultView) && xDef(document.defaultView.getComputedStyle)){
    pl=xGetCS(ele,'padding-left');
    pr=xGetCS(ele,'padding-right');
    bl=xGetCS(ele,'border-left-width');
    br=xGetCS(ele,'border-right-width');
  }
  else if(xDef(ele.currentStyle,document.compatMode)){
    if(document.compatMode=='CSS1Compat'){
      pl=parseInt(ele.currentStyle.paddingLeft);
      pr=parseInt(ele.currentStyle.paddingRight);
      bl=parseInt(ele.currentStyle.borderLeftWidth);
      br=parseInt(ele.currentStyle.borderRightWidth);
    }
  }
  else if(xDef(ele.offsetWidth,ele.style.width)){ // ?
    ele.style.width=uW+'px';
    pl=ele.offsetWidth-uW;
  }
  if(isNaN(pl)) pl=0; if(isNaN(pr)) pr=0; if(isNaN(bl)) bl=0; if(isNaN(br)) br=0;
  var cssW=uW-(pl+pr+bl+br);
  if(isNaN(cssW)||cssW<0) return;
  else ele.style.width=cssW+'px';
}
function xSetCH(ele,uH){
  var pt=0,pb=0,bt=0,bb=0;
  if(xDef(document.defaultView) && xDef(document.defaultView.getComputedStyle)){
    pt=xGetCS(ele,'padding-top');
    pb=xGetCS(ele,'padding-bottom');
    bt=xGetCS(ele,'border-top-width');
    bb=xGetCS(ele,'border-bottom-width');
  }
  else if(xDef(ele.currentStyle,document.compatMode)){
    if(document.compatMode=='CSS1Compat'){
      pt=parseInt(ele.currentStyle.paddingTop);
      pb=parseInt(ele.currentStyle.paddingBottom);
      bt=parseInt(ele.currentStyle.borderTopWidth);
      bb=parseInt(ele.currentStyle.borderBottomWidth);
    }
  }
  else if(xDef(ele.offsetHeight,ele.style.height)){ // ?
    ele.style.height=uH+'px';
    pt=ele.offsetHeight-uH;
  }
  if(isNaN(pt)) pt=0; if(isNaN(pb)) pb=0; if(isNaN(bt)) bt=0; if(isNaN(bb)) bb=0;
  var cssH=uH-(pt+pb+bt+bb);
  if(isNaN(cssH)||cssH<0) return;
  else ele.style.height=cssH+'px';
}
function xClip(e,iTop,iRight,iBottom,iLeft) {
  if(!(e=xGetElementById(e))) return;
  if(e.style) {
    if (xNum(iLeft)) e.style.clip='rect('+iTop+'px '+iRight+'px '+iBottom+'px '+iLeft+'px)';
    else e.style.clip='rect(0 '+parseInt(e.style.width)+'px '+parseInt(e.style.height)+'px 0)';
  }
}
// experimenting with CSS1Compat:
function xClientWidth() {
  var w=0;
  if(xOp5or6) w=window.innerWidth;
  else if(document.compatMode == 'CSS1Compat' && !window.opera && document.documentElement && document.documentElement.clientWidth)
    w=document.documentElement.clientWidth;
  else if(document.body && document.body.clientWidth)
    w=document.body.clientWidth;
  else if(xDef(window.innerWidth,window.innerHeight,document.height)) {
    w=window.innerWidth;
    if(document.height>window.innerHeight) w-=16;
  }
  return w;
}
// experimenting with CSS1Compat:
function xClientHeight() {
  var h=0;
  if(xOp5or6) h=window.innerHeight;
  else if(document.compatMode == 'CSS1Compat' && !window.opera && document.documentElement && document.documentElement.clientHeight)
    h=document.documentElement.clientHeight;
  else if(document.body && document.body.clientHeight)
    h=document.body.clientHeight;
  else if(xDef(window.innerWidth,window.innerHeight,document.width)) {
    h=window.innerHeight;
    if(document.width>window.innerWidth) h-=16;
  }
  return h;
}
