package com.thesarvo.guide.client.controller;

import static com.thesarvo.guide.client.util.StringUtil.notNull;

import java.util.ArrayList;
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
import com.thesarvo.guide.client.util.BrowserUtil;
import com.thesarvo.guide.client.util.StringUtil;
import com.thesarvo.guide.client.util.WidgetUtil;
import com.thesarvo.guide.client.view.GuideView;
import com.thesarvo.guide.client.view.NodeWrapper;
import com.thesarvo.guide.client.view.node.BoundListBox;
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
	String user;
	String servletUrl;

	Map<String, Document> guideXmlCache = new HashMap<String, Document>();

	boolean multiPage = false;

	EventBus eventBus;

	Widget currentView = null;

	RootPanel viewContainer = null;

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

		String url = getServletUrl() + "guide/xml/"
				+ getCurrentGuide().getGuideId();
		url += "?user=" + getUser();

		// TODO: how to get at the xml!
		String data = this.getXml().toString();

		// Window.alert(data);

		// Window.setStatus("Saving guide data...");
		getCurrentGuide().getGuideView().showPopup(true);

		RequestBuilder builder = new RequestBuilder(RequestBuilder.POST,
				URL.encode(url));

		try
		{
			Request request = builder.sendRequest(data,

			new RequestCallback()
			{

				@Override
				public void onResponseReceived(Request request,
						Response response)
				{
					if (response.getStatusCode() != 200)
						saveError(" status code was "
								+ response.getStatusCode());

					getCurrentGuide().getGuideView().showPopup(false);
				}

				@Override
				public void onError(Request request, Throwable exception)
				{
					saveError(exception.getMessage());

				}

			});
		}
		catch (RequestException e)
		{
			saveError(e.getMessage());
		}

		// Window.alert("FIXME!");
		/*
		 * FIXME - rewrite simpler
		 * 
		 * 
		 * XmlService.doXmlRequest(url, RequestBuilder.POST, data, new
		 * XmlRequestCallback() {
		 * 
		 * @Override public void onError(Request request, Throwable exception) {
		 * Window.alert("Error saving data: " + exception.getMessage() +
		 * "\nI will reload the page so you can try again.\n" + ERROR_MSG);
		 * 
		 * Window.Location.reload(); }
		 * 
		 * @Override public void handleXml(Document xml) { // do nothing
		 * //Window.setStatus("Guide data saved ok.");
		 * getCurrentGuide().getGuideView().showPopup(false); } });
		 */
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

	public String convertToCached(String url, boolean fromHtml)
	{
		String ret = url;

		if (Window.Location.getProtocol().startsWith("file:"))
		{
			// ret = "file:///C:/GuideData/" + URL.encodeComponent(url);
			String enc = URL.encodeComponent(url);
			enc = enc.replace("+", "%20");

			if (!fromHtml)
				ret = "../data/cache/" + enc;
			else
				ret = "data/cache/" + URL.encodeComponent(enc);
		}
		return ret;
	}

	public String getAttachmentUrl(String src, boolean thumbnail, String width)
	{
		// 4489230
		// http://www.thesarvo.com/confluence/download/thumbnails/222/Adamsfieldsubzero.jpg

		String ret = "";

		if (Window.Location.getProtocol().startsWith("file")
				|| Window.Location.getHost().equals("127.0.0.1:8888"))
		{
			// hardcoded path for debugging in the GWT debugger
			ret = "http://www.thesarvo.com/confluence/plugins/servlet/guide/image/"
					+ getGuideId() + "/" + src;

			if (StringUtil.isNotEmpty(width))
				ret += "?width=" + width;
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

		return convertToCached(ret, true);

	}

	public String getGuideId()
	{
		if (getCurrentGuide() != null)
			return getCurrentGuide().getGuideId();
		else
			return null;
	}

	public void populateAttachments(final ListBox srcListBox)
	{
		if (getCurrentGuide().getAttachments() != null)
			WidgetUtil.populateListBox(srcListBox, getCurrentGuide()
					.getAttachments());
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
								 
						WidgetUtil.populateListBox(srcListBox, attachments); }



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

	public void onAdd(NodeWrapper nw, String type)
	{

		NodeWrapper newNw = getCurrentGuide().add(nw, type);

		onEdit(newNw, true);
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

	public void populateClimbs(final BoundListBox climbsListBox,
			final String extraPageId, final boolean insertBefore)
	{
		climbsListBox.clear();
		final List<String[]> climbs = getClimbStrings(getXml(), "");

		final Command cmd = new Command()
		{
			@Override
			public void execute()
			{
				// climbsListBox.addItem("","");
				for (String[] s : climbs)
				{
					climbsListBox.addItem(s[0], s[1]);
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
		return isMultiPage() && BrowserUtil.isMobileBrowser()
				&& Window.Location.getProtocol().startsWith("file");
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

}
