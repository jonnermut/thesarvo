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

