package com.thesarvo.guide.client.controller;

import static com.thesarvo.guide.client.util.StringUtil.notNull;

import java.io.UnsupportedEncodingException;
import java.math.BigInteger;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.RunAsyncCallback;
import com.google.gwt.http.client.Request;
import com.google.gwt.http.client.RequestBuilder;
import com.google.gwt.http.client.RequestCallback;
import com.google.gwt.http.client.RequestException;
import com.google.gwt.http.client.Response;
import com.google.gwt.http.client.URL;
import com.google.gwt.i18n.client.DateTimeFormat;
import com.google.gwt.user.client.Command;
import com.google.gwt.user.client.DeferredCommand;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.ListBox;
import com.google.gwt.user.client.ui.RootPanel;
import com.google.gwt.user.client.ui.Widget;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.google.web.bindery.event.shared.EventBus;
import com.thesarvo.guide.client.application.Application;
import com.thesarvo.guide.client.model.Guide;
import com.thesarvo.guide.client.model.NodeType;
import com.thesarvo.guide.client.phototopo.Console;
import com.thesarvo.guide.client.util.BackgroundFader;
import com.thesarvo.guide.client.util.BrowserUtil;
import com.thesarvo.guide.client.util.Logger;
import com.thesarvo.guide.client.util.RGB;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.view.GuideView;
import com.thesarvo.guide.client.view.NodeWrapper;
import com.thesarvo.guide.client.xml.XPath;
import com.thesarvo.guide.client.xml.XmlService;
import com.thesarvo.guide.client.xml.XmlSimpleModel;

public class Controller
{
	// private static final String CONFLUENCE_PLUGINS_SERVLET =
	// "http://www.thesarvo.com/confluence/plugins/servlet/";

	protected static final String ERROR_MSG = "Email jon@thesarvo.com if the error happens again.";

	// static Controller instance = new Controller();

	boolean editMode = false;

	private NodeWrapper currentEditor = null;
	private Node currentEditNodeClone = null;

	boolean canEdit;
	boolean callOut;
	String user;
	String servletUrl;
	String showId = null;

	Map<String, Document> guideXmlCache = new HashMap<String, Document>();

	boolean multiPage = false;

	EventBus eventBus;

	Widget currentView = null;

	RootPanel viewContainer = null;
	
	boolean saving = false;
	boolean queuedSave = false;

	public Controller(EventBus eventBus)
	{
		super();
		this.eventBus = eventBus;
	}

	public static Controller get()
	{
		return (Controller) Application.get().getController();
	}

	/**
	 * @return the editMode
	 */
	public boolean isEditMode()
	{
		return editMode;
	}

	/**
	 * @param editMode
	 *            the editMode to set
	 */
	public void setEditMode(boolean editMode)
	{
		this.editMode = editMode;
	}

	/**
	 * @return the currentEditor
	 */
	public NodeWrapper getCurrentEditor()
	{
		return currentEditor;
	}

	/**
	 * @param currentEditor
	 *            the currentEditor to set
	 */
	public void setCurrentEditor(NodeWrapper currentEditor)
	{
		this.currentEditor = currentEditor;
	}

	public void toggleEditMode()
	{
		GWT.runAsync(new RunAsyncCallback()
		{

			@Override
			public void onSuccess()
			{
				editMode = !editMode;

				for (NodeWrapper nw : getCurrentGuide().getNodeWrappers())
				{
					nw.setupEditNode();
					nw.setEditMode(editMode);
				}
			}

			@Override
			public void onFailure(Throwable reason)
			{
				Window.alert("Something happened, could not enter edit mode!");
			}
		});
	}

	public void onEdit(NodeWrapper nw)
	{
		onEdit(nw, true);
	}

	public void onDelete(NodeWrapper nw)
	{
		removeNode(nw);

		saveAll();

	}

	private void removeNode(NodeWrapper nw)
	{
		Node n = nw.getNode();
		n.getParentNode().removeChild(n);
		getCurrentGuide().getNodeWrappers().remove(nw);
		getCurrentGuide().getNodesById().values().remove(nw);
		getCurrentGuide().getGuideView().remove(nw);
	}

	private void saveAll()
	{
		if (Window.Location.getHost().startsWith("127.0.0.1"))
			return;
		
		if (saving)
		{
			Logger.debug("Queued Save");
			queuedSave = true;
			return;
		}
		
		queuedSave = false;
		saving = true;
	
		try
		{

			String url = getServletUrl() + "guide/xml/"
					+ getCurrentGuide().getGuideId();
			url += "?user=" + getUser();
	
			
			String data = this.getXml().toString();
	
			// Window.alert(data);
	
			// Window.setStatus("Saving guide data...");
			getCurrentGuide().getGuideView().showPopup(true);
	
			Logger.debug("Saving...");
			//Logger.debug("Saving xml: " + data);
			
			RequestBuilder builder = new RequestBuilder(RequestBuilder.POST,
					URL.encode(url));


			Request request = builder.sendRequest(data,

			new RequestCallback()
			{

				@Override
				public void onResponseReceived(Request request,
						Response response)
				{
					try
					{
						if (response.getStatusCode() != 200)
							saveError(" status code was "
									+ response.getStatusCode());
						
						Logger.debug("save onResponseReceived status code=" + response.getStatusCode());
	
						getCurrentGuide().getGuideView().showPopup(false);
					}
					catch (Exception e)
					{
						
					}
					
					saving = false;
					if (queuedSave)
						saveAll();
				}

				@Override
				public void onError(Request request, Throwable exception)
				{
					try
					{
						saveError(exception.getMessage());
	
						Logger.debug("save onError"); 
					}
					catch (Exception e)
					{
						
					}
					
					saving = false;
					if (queuedSave)
						saveAll();
				}

			});
		}
		catch (Exception e)
		{
			saving = false;
			saveError(e.getMessage());
		}


	}

	public void saveError(String msg)
	{
		Window.alert("Error saving data: " + msg
				+ "\nI will reload the page so you can try again.\n"
				+ ERROR_MSG);

		Window.Location.reload();
	}

	public void onSave(NodeWrapper nw)
	{
		nw.setDeleteOnCancel(false);
		currentEditNodeClone = null;

		nw.saveChanges();

		onCancel(nw);
		nw.update();
		
		getCurrentGuide().update();

		saveAll();
	}

	public void onCancel(NodeWrapper nw)
	{
		if (nw.isDeleteOnCancel())
		{
			currentEditor = null;
			removeNode(nw);
		}
		else
		{
			nw.setEditing(false);
			currentEditor = null;

			if (currentEditNodeClone != null)
			{
				nw.getNode().getParentNode()
						.replaceChild(currentEditNodeClone, nw.getNode());
				nw.setNode(currentEditNodeClone);
				nw.update();
				currentEditNodeClone = null;
			}

			scrollToNode(nw);
		}
	}

	public void onEdit(NodeWrapper nw, boolean allowCancel)
	{

		if (currentEditor != null && currentEditor != nw)
		{
			if (allowCancel)
				onCancel(currentEditor);
			else
				return;
		}
		setCurrentEditor(nw);
		nw.setEditing(true);
		currentEditNodeClone = nw.getNode().cloneNode(true);

		scrollToNode(nw);
	}

	private void scrollToNode(NodeWrapper nw)
	{
		Window.scrollTo(0, nw.getAbsoluteTop() - 20);
	}

	  
	private static final BigInteger INIT64  = new BigInteger("cbf29ce484222325", 16);
	private static final BigInteger PRIME64 = new BigInteger("100000001b3",      16);	 
	private static final BigInteger MOD64   = new BigInteger("2").pow(64);
	
	public BigInteger fnv1a_64(String data)
	{
		try
		{
			return fnv1a_64( data.getBytes("UTF-8"));
		}
		catch (UnsupportedEncodingException e)
		{
			// TODO Auto-generated catch block
			e.printStackTrace();
			return BigInteger.ZERO;
		}
	}
	
	public BigInteger fnv1a_64(byte[] data)
	{
		BigInteger hash = INIT64;

		for (byte b : data)
		{
			hash = hash.xor(BigInteger.valueOf((int) b & 0xff));
			hash = hash.multiply(PRIME64).mod(MOD64);
		}

		return hash;
	}
	
	public String convertToCached(String url, String src, boolean thumbnail , boolean fromHtml)
	{
		String ret = url;

		if (Window.Location.getProtocol().startsWith("file:"))
		{
			// ret = "file:///C:/GuideData/" + URL.encodeComponent(url);
			/*
			String enc = URL.encodeComponent(url);
			enc = enc.replace("+", "%20");
			enc = enc.replace("%", "-");
			*/
			/*
			String path = url;
			if (path.lastIndexOf('/') > 0)
				path = path.substring(path.lastIndexOf('/'));
			if (path.lastIndexOf('?') >= 0)
				path = path.substring(0, path.lastIndexOf('?') - 1 );
			
			String ext = ".xml";
			int idx = path.lastIndexOf(".");
			if (idx > -1)
			{
				ext = path.substring(idx);
			}
			String enc = fnv1a_64(url) + ext.toLowerCase();
			
			if (!fromHtml)
				ret = "../data/" + enc;
			else
				ret = "data/" + URL.encodeComponent(enc);
				*/
			String filename = "" + getGuideId();
			if (thumbnail)
				filename += "-t-";
			else
				filename += "-";
			
			filename += src.toLowerCase();
			
			if (!fromHtml)
				ret = "../data/" + filename;
			else
			{
				String enc = URL.encodeComponent(filename);
				enc = enc.replace("+", "%20");
				ret = "data/" + enc;
			}
		}
		return ret;
	}

	public String getAttachmentUrl(String src, boolean thumbnail, String width)
	{
		// 4489230
		// http://www.thesarvo.com/confluence/download/thumbnails/222/Adamsfieldsubzero.jpg

		String ret = "";

		if ( Window.Location.getProtocol().startsWith("file") ||
				 Window.Location.getHost().equals("127.0.0.1:8888"))
		{
			
			// hardcoded path for debugging in the GWT debugger & for mobile app
			
			if (thumbnail)
			{
				ret = "http://www.thesarvo.com/confluence/download/thumbnails/" + getGuideId() + "/" + src;
			}
			else
			{
				ret = "http://www.thesarvo.com/confluence/plugins/servlet/guide/image/"
						+ getGuideId() + "/" + src;
	
				if (StringUtil.isNotEmpty(width))
					ret += "?width=" + width;
			}
		}
		else
		{
			ret = "../../download/";

			if (thumbnail)
				ret += "thumbnails/" + getGuideId() + "/" + src;
			else
			{
				ret += "attachments/" + getGuideId() + "/" + src;
			}
		}

		return convertToCached(ret, src, thumbnail, true);

	}

	public String getGuideId()
	{
		if (getCurrentGuide() != null)
			return getCurrentGuide().getGuideId();
		else
			return null;
	}

	public void populateAttachments(final ListBox srcListBox, final String selected, final boolean selectNew)
	{
		srcListBox.addItem("<select>", "");
		
		if (getCurrentGuide().getAttachments() != null)
		{
			Collections.sort(getCurrentGuide().getAttachments());
			WidgetUtil.populateListBox(srcListBox, getCurrentGuide().getAttachments());
			WidgetUtil.setValue(srcListBox, selected);
		}
		else
		{
			String url = getServletUrl() + "guide/attachments/"
					+ getCurrentGuide().getGuideId();

			RequestBuilder builder = new RequestBuilder(RequestBuilder.GET,
					URL.encode(url));

			
			try
			{
				
				Request request = builder.sendRequest(null, 

				new RequestCallback()
				{

					@Override
					public void onResponseReceived(Request request,
							Response response)
					{
						Document xml = XmlService.parseXml(response.getText());
						
						List<Node> list = XPath.selectNodes(xml, "attachments/attachment");
								  
						List<String> attachments = new ArrayList<String>();
						
						getCurrentGuide().setAttachments(attachments);
								 
						for (Node n : list) 
							attachments.add(XPath.getText(n));
						
						String vsel = selected;
						if (StringUtil.isEmpty(vsel) && selectNew)
						{
							if (attachments.size() > 0)
								vsel = attachments.get(attachments.size()-1);
						}
						
						Collections.sort(attachments);
						
						WidgetUtil.populateListBox(srcListBox, attachments); 
						WidgetUtil.setValue(srcListBox, vsel);
					}



					@Override
					public void onError(Request request, Throwable exception)
					{
						

					}

				});
				
				
			}
			catch (RequestException e)
			{
			}
			

		}
	}

	/*
	 * 
	 * public void getGuideXml(final String pageId, final boolean cache, final
	 * boolean immediateIfCached, final XmlRequestCallback callback) {
	 * 
	 * if (cache) { final Document ret = guideXmlCache.get(pageId); if
	 * (ret!=null) {
	 * 
	 * if (immediateIfCached) { callback.handleXml(ret); } else {
	 * DeferredCommand.addCommand(new Command() {
	 * 
	 * @Override public void execute() { callback.handleXml(ret); } });
	 * 
	 * }
	 * 
	 * return; } }
	 * 
	 * String url = getServletUrl() + "guide/xml/" + pageId ;
	 * 
	 * if (Window.Location.getHost().contains("127.0.0.1") ||
	 * Window.Location.getHost().startsWith("192.168") ||
	 * Window.Location.getHost().startsWith("172.27")) { url =
	 * "../data/MtBrown.xml"; }
	 * 
	 * url = convertToCached(url, false);
	 * 
	 * XmlService.doXmlRequest(url, new XmlRequestCallback() {
	 * 
	 * @Override public void onError(Request request, Throwable exception) {
	 * callback.onError(request, exception); }
	 * 
	 * @Override public void handleXml(Document xml) { if (cache)
	 * guideXmlCache.put(pageId, xml);
	 * 
	 * callback.handleXml(xml); } }) ; }
	 */

	public List<String[]> getClimbStrings()
	{
		return getClimbStrings(getXml(), "");
	}
	
	public List<String[]> getClimbStrings(Document document, String prefix)
	{
		List<String[]> ret = new ArrayList<String[]>();
		for (NodeWrapper nw : getCurrentGuide().getNodeWrappers())
		{
			if (nw.getNodeType().equals(NodeType.climb)
					|| nw.getNodeType().equals(NodeType.problem))
			{
				XmlSimpleModel model = nw.getReadNode().getModel();
				String s = notNull(StringUtil.string(model.get("@number")))
						+ " " + notNull(StringUtil.string(model.get("@name")))
						+ " " + notNull(StringUtil.string(model.get("@grade")));
				ret.add(new String[] { s, StringUtil.string(model.get("@id")) });
			}
		}

		// List<Node> climbs = XPath.selectNodes(document, "guide/climb");
		// if (climbs!=null && climbs.size() > 0)
		// addClimbStringToList(climbs, ret, prefix);
		//
		// climbs = XPath.selectNodes(document, "guide/problem");
		// if (climbs!=null && climbs.size() > 0)
		// addClimbStringToList(climbs, ret, prefix);

		return ret;
	}

	private void addClimbStringToList(List<Node> climbs, List<String[]> ret,
			String prefix)
	{
		for (Node n : climbs)
		{
			Element el = (Element) n;
			String str = notNull(el.getAttribute("number"));
			str += " " + notNull(el.getAttribute("name"));
			str += " " + notNull(el.getAttribute("grade"));
			String id = prefix + notNull(el.getAttribute("id"));

			ret.add(new String[] { str, id });
		}
	}

	/**
	 * @return the xml
	 */
	public Document getXml()
	{
		return getCurrentGuide().getXml();
	}

	// public void showGuide()
	// {
	// GuideView guideView = new GuideView();
	// Panel rootPanel = getViewContainer();
	// rootPanel.add(guideView);
	//
	// addNodesToGuideView();
	// }

	GuideView getGuideView()
	{
		return getCurrentGuide().getGuideView();
	}

	private void addNodesToGuideView(final GuideView gv)
	{
		gv.getGuide().addNodesToGuideView();

		DeferredCommand.addCommand(new Command()
		{

			@Override
			public void execute()
			{
				if (isCanEdit() && getUser() != null)
					gv.setEditVisible(true);

				if (isCanEdit() && getUser() != null
						&& getUser().equals("jnermut"))
				{
					gv.showAdvanced();
				}
			}
		});
	}

	public Node getNode(String id)
	{

		NodeWrapper nodeWrapper = getCurrentGuide().getNodesById().get(id);
		if (nodeWrapper != null)
			return nodeWrapper.getNode();
		else
			return null;

	}
	
	public NodeWrapper getNodeWrapper(String id)
	{
		return getCurrentGuide().getNodesById().get(id);
	}

	/**
	 * @return the canEdit
	 */
	public boolean isCanEdit()
	{
		return canEdit;
	}

	/**
	 * @param canEdit
	 *            the canEdit to set
	 */
	public void setCanEdit(boolean canEdit)
	{
		this.canEdit = canEdit;
	}

	public String getGraphUrl()
	{

		return getServletUrl() + "graph?type=png&pageId="
				+ getCurrentGuide().getGuideId();
	}

	/**
	 * @return the user
	 */
	public String getUser()
	{
		return user;
	}

	/**
	 * @param user
	 *            the user to set
	 */
	public void setUser(String user)
	{
		this.user = user;
	}

	public void onAdd(final NodeWrapper nw, final String type)
	{
		
		NodeWrapper newNw = getCurrentGuide().add(nw, type);

		onEdit(newNw, true);
		
//		GWT.runAsync(new RunAsyncCallback()
//		{
//			
//
//			
//			@Override
//			public void onSuccess()
//			{
//
//				
//			}
//			
//			@Override
//			public void onFailure(Throwable reason)
//			{
//				Window.alert("Could not add for some reason;" + reason);
//				
//			}
//		});
		
	}

	private void log(String log)
	{
		getGuideView().addLogLine(log);
	}

	public void upgrade()
	{
		GWT.runAsync(new RunAsyncCallback()
		{

			@Override
			public void onSuccess()
			{
				tryUpgrade();
			}

			@Override
			public void onFailure(Throwable reason)
			{
				Window.alert("run async for tryUpgrade failed!");
			}
		});

	}

	private void tryUpgrade()
	{
		try
		{
			Element guide = (Element) XPath.selectSingleNode(getXml(), "guide");
			String v = guide.getAttribute("version");

			int version = 0;
			if (v != null && v.length() > 0)
				version = Integer.valueOf(v);

			log("Current version:" + version);

			int newVersion = version;

			if (version < 1)
			{
				upgradeTo1();
				newVersion = 1;
			}
			if (version < 2)
			{
				upgradeTo2();
				newVersion = 2;
			}
			if (version < 3)
			{
				upgradeTo3();
				newVersion = 3;
			}

			guide.setAttribute("version", Integer.toString(newVersion));

			for (NodeWrapper nw : getCurrentGuide().getNodeWrappers())
				nw.update();
		}
		catch (Exception e)
		{
			log("Error upgrading!");
			log(e.getMessage());
			log(e.toString());

			throw new RuntimeException(e);
		}
	}

	private void upgradeTo2()
	{
		log("Upgrading to version 2");

		removeFluff(XPath.selectNodes(getXml(), "guide/problem"), false);
		removeFluff(XPath.selectNodes(getXml(), "guide/image"), true);
		removeFluff(XPath.selectNodes(getXml(), "guide/header"), true);
		removeFluff(XPath.selectNodes(getXml(), "guide/gps"), true);
		removeFluff(XPath.selectNodes(getXml(), "guide/text"), true);

		List<Node> climbs = XPath.selectNodes(getXml(), "guide/climb");

		for (Node c : climbs)
		{
			String fa = ((Element) c).getAttribute("fa");
			if (fa != null && fa.length() > 0)
			{
				fa = fa.trim();
				String newfa = DateFixer.fixDates(fa).trim();

				if (!fa.equals(newfa))
				{
					log("Changing fa from=" + fa + " to=" + newfa);
					fa = newfa;
				}

				((Element) c).setAttribute("fa", fa.trim());
			}
		}
	}

	private void upgradeTo3()
	{
		log("Upgrading to version 3");

		// Pattern pattern1 = new
		// Pattern("([\\(]*\\d+[a-z]?[\\),\\.])\\s([\\d,\\(,\\),m,\\s]+)(\\.?)");

		List<Node> climbs = XPath.selectNodes(getXml(), "guide/climb");
		for (Node c : climbs)
		{
			String text = XPath.getText(c);
			if (text != null && text.length() > 0)
			{
				text = text
						.replaceAll(
								"([\\r,\\n]*)([\\(]*)(\\d+[a-z]?)([\\),\\.])\\s([\\d,\\(,\\),m,\\-,\\s]+)(\\.?)",
								"__(($3. $5))__");

				String[] bits = text.split("__");
				text = "";
				for (String bit : bits)
				{
					if (bit.startsWith("(("))
					{
						bit = bit.replace("(", "");
						bit = bit.replace(")", "");
						bit = bit.trim();
						bit = "\r\n" + bit + ". ";
					}
					else
						bit = bit.trim();

					text += bit;
				}

				text = text.trim();
				XPath.setText(c, text);
			}
		}
	}

	private void upgradeTo1()
	{
		log("Upgrading to version 1");

		List<Node> climbs = XPath.selectNodes(getXml(), "guide/climb");

		for (Node c : climbs)
		{
			Element climb = (Element) c;
			climb.removeAttribute("new");
			climb.removeAttribute("value");

			String text = XPath.getText(climb);
			if (text == null)
				text = "";

			text = text.trim();
			String name = climb.getAttribute("name");

			text = text.replace("Jan.", "Jan");
			text = text.replace("Feb.", "Feb");
			text = text.replace("Mar.", "Mar");
			text = text.replace("Apr.", "Apr");
			text = text.replace("May", "May");
			text = text.replace("Jun.", "Jun");
			text = text.replace("Jul.", "Jul");
			text = text.replace("Aug.", "Aug");
			text = text.replace("Sep.", "Sep");
			text = text.replace("Oct.", "Oct");
			text = text.replace("Nov.", "Nov");
			text = text.replace("Dec.", "Dec");
			text = text.replace("Jan/", "Jan ");
			text = text.replace("Feb/", "Feb ");
			text = text.replace("Mar/", "Mar ");
			text = text.replace("Apr/", "Apr ");
			text = text.replace("May/", "May ");
			text = text.replace("Jun/", "Jun ");
			text = text.replace("Jul/", "Jul ");
			text = text.replace("Aug/", "Aug ");
			text = text.replace("Sep/", "Sep ");
			text = text.replace("Oct/", "Oct ");
			text = text.replace("Nov/", "Nov ");
			text = text.replace("Dec/", "Dec ");

			// int idx = text.lastIndexOf(". ");

			String fa = null;

			DateTimeFormat dtf;

			// Pattern stop = Pattern.compile("\\S{2}\\. ");
			// String[] splits = stop.split(text);

			String[] splits = text.split("\\S{2}\\. ");
			if (splits.length > 1)
			{
				fa = splits[splits.length - 1];
				if (!(fa.contains("20") || fa.contains("19")
						|| fa.contains("6") || fa.contains("7")
						|| fa.contains("8") || fa.contains("9") || fa
							.contains("0")))
				{
					fa = null;
				}

			}
			if (fa != null)
			{
				int len = fa.length();

				try
				{
					fa = DateFixer.fixDates(fa);
				}
				catch (Exception e)
				{
					log("Exception trying to fix dates for: " + fa + " - "
							+ e.getMessage());
				}

				text = text.substring(0, text.length() - len);

				log("Setting fa for name=" + name + " to:");
				log(" > " + fa);

				climb.setAttribute("fa", fa);
				XPath.setText(climb, text);
			}
			else
			{
				log("*** Couldnt find fa for name=" + name);
			}
		}

	}

	private static void removeFluff(List<Node> nodes, boolean removeNum)
	{
		if (nodes != null)
		{
			for (Node n : nodes)
			{
				Element e = (Element) n;
				e.removeAttribute("new");
				e.removeAttribute("value");
				if (removeNum)
					e.removeAttribute("number");
			}
		}

	}

	public void populateClimbs(final ListBox climbsListBox,
			final String extraPageId, final boolean insertBefore, final String selectedId)
	{
		//climbsListBox.clear();
		final List<String[]> climbs = getClimbStrings(getXml(), "");

		final Command cmd = new Command()
		{
			@Override
			public void execute()
			{
				// climbsListBox.addItem("","");
				int i=0;
				for (String[] s : climbs)
				{
					climbsListBox.addItem(s[0], s[1]);
					
					if (StringUtil.isNotEmpty(selectedId) && selectedId.equals(s[1]))
						climbsListBox.setSelectedIndex(i+1);
					
					i++;
				}

				// binder.updateWidget(climbsListBox);

			}
		};

		/*
		 * if (StringUtil.isNotEmpty(extraPageId)) { XmlRequestCallback cb = new
		 * XmlRequestCallback() {
		 * 
		 * @Override public void onError(Request request, Throwable exception) {
		 * Window.alert("Could not fetch data for pageId=" + extraPageId );
		 * cmd.execute(); }
		 * 
		 * @Override public void handleXml(Document xml) { // add the new climbs
		 * to the list List<String[]> extra = getClimbStrings(xml, extraPageId +
		 * ":");
		 * 
		 * if (insertBefore) climbs.addAll(0, extra); else climbs.addAll(
		 * extra);
		 * 
		 * cmd.execute(); } };
		 * 
		 * getGuideXml(extraPageId, true, false, cb); } else
		 */
		DeferredCommand.addCommand(cmd);

	}

	/**
	 * @return the multiPage
	 */
	public boolean isMultiPage()
	{
		return multiPage;
	}

	/**
	 * @param multiPage
	 *            the multiPage to set
	 */
	public void setMultiPage(boolean multiPage)
	{
		this.multiPage = multiPage;
	}

	public boolean isMobileApp()
	{
		//return true;
		return BrowserUtil.isMobileBrowser() && Window.Location.getProtocol().startsWith("file");
	}

	public GuideView createGuideView(String id, Document xml)
	{
		final GuideView gv = new GuideView(id);

		if (xml != null)
		{
			gv.getGuide().setXml(xml);
			addNodesToGuideView(gv);
		}
		/*
		 * TODO - dunno whether its needed
		 * 
		 * getGuideXml(entityId, true, true, new XmlRequestCallback() {
		 * 
		 * @Override public void onError(Request request, Throwable exception) {
		 * Window.alert("Could not get data for guide id=" + entityId + "\n" +
		 * exception.getMessage()); }
		 * 
		 * @Override public void handleXml(Document xml) {
		 * gv.getGuide().setXml(xml); addNodesToGuideView(gv); } });
		 */

		return gv;
	}

	/*
	 * protected Widget createView(String type, final String entityId) {
	 * 
	 * Widget ret = super.createView(type, viewConfig, entityId);
	 * 
	 * if (ret==null) { if (type.equals("GuideView")) {
	 * 
	 * 
	 * } }
	 * 
	 * return ret; }
	 */

	/**
	 * @return the currentGuide
	 */
	public Guide getCurrentGuide()
	{
		Widget w = getCurrentView();
		if (w instanceof GuideView)
			return ((GuideView) w).getGuide();
		else
			return null;

	}

	/**
	 * @return the guideXmlCache
	 */
	public Map<String, Document> getGuideXmlCache()
	{
		return guideXmlCache;
	}

	/**
	 * @return the servletUrl
	 */
	public String getServletUrl()
	{
		if (servletUrl == null)
			servletUrl = "../../plugins/servlet/";

		return servletUrl;
	}

	/**
	 * @param servletUrl
	 *            the servletUrl to set
	 */
	public void setServletUrl(String servletUrl)
	{
		this.servletUrl = servletUrl;
	}

	// /// Resurrected from missing base class
	public Widget getCurrentView()
	{
		return currentView;
	}

	public void setViewContainer(RootPanel rootPanel)
	{
		viewContainer = rootPanel;

	}

	public void setCurrentView(Widget gv, String id)
	{
		currentView = gv;

	}



	public void onMove(NodeWrapper nw, int dir)
	{
		// move the xml first
		Node n = nw.getNode();
		Node p = n.getParentNode();
		GuideView gv = getCurrentGuide().getGuideView();
		
		NodeWrapper newSuccessor = gv.moveNode(nw, dir);

		p.removeChild(n);
		if (newSuccessor != null)
		{
			p.insertBefore(n, newSuccessor.getNode());
		}
		else
		{
			// at the end
			p.appendChild(n);
		}
		
		/* This never worked properly because it didnt take into account text nodes that may come up as next sibling etc
		if (dir < 0)
		{
			Node prev = n.getPreviousSibling();
			if (prev != null)
			{
				p.removeChild(n);
				p.insertBefore(n, prev);

			}
			
		}
		else
		{
			Node next = n.getNextSibling();
			if (next != null)
			{
				Node nextNext = next.getNextSibling();
				p.removeChild(n);
				if (nextNext != null)
					p.insertBefore(n, nextNext);
				else
					p.appendChild(n);
			}
		}
		*/
		getCurrentGuide().update();
		
		saveAll();
		
	}

	public void sendCommandToApp(String command, String data)
	{
		String url = "ts://" + command + "/" + URL.encodePathSegment(data);
		Window.Location.replace(url);
	}

	/**
	 * @return the callOut
	 */
	public boolean isCallOut()
	{
		return callOut;
	}

	/**
	 * @param callOut the callOut to set
	 */
	public void setCallOut(boolean callOut)
	{
		this.callOut = callOut;
	}



	/**
	 * @return the showId
	 */
	public String getShowId()
	{
		return showId;
	}

	/**
	 * @param showId the showId to set
	 */
	public void setShowId(String showId)
	{
		this.showId = showId;
	}
	
	public void scrollToId(String id)
	{
		Console.log("Contoller.scrollToId(" + id + ")");
		final NodeWrapper nw = getNodeWrapper(id);
		if (nw != null)
		{
			Window.scrollTo(0, nw.getElement().getAbsoluteTop());
			

			//BackgroundFader f = new BackgroundFader(nw.getElement());
			//f.fade(2000, new RGB("#f0f0b0"), new RGB("#ffffff") ); 
			
			//Console.log("Setting BG");
			nw.getElement().getStyle().setBackgroundColor("#ffb");
			nw.getElement().getStyle().setProperty("transition", "0.2s");
			
			Timer t = new Timer()
			{
				
				@Override
				public void run()
				{
					Console.log("Fading out");
					nw.getElement().getStyle().setBackgroundColor("#ffffff");
					nw.getElement().getStyle().setProperty("transition", "2s");
				}
			};
			t.schedule(2000);
			
		}
	}
}
