package com.thesarvo.guide;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

/**
 * Created by jon on 25/01/14.
 */
public class ViewModel
{
    public class ViewDef
    {


        String id;
        String type;
        String name;
        boolean rootView = false;
        List<ListItem> listItems = new ArrayList<ListItem>();


        public ViewDef(Element element)
        {
            this.id = element.getAttribute("id");
            this.type = element.getAttribute("type");
            this.name = element.getAttribute("name");
            this.rootView = "true".equals( element.getAttribute("rootView"));

            Element data = Xml.getFirstElementByName(element, "data");
            if (data != null)
            {
                for (Element el : Xml.getElementsByName(data, "listItem"))
                {
                    listItems.add( new ListItem(el) );
                }
            }

        }

        public String getId()
        {
            return id;
        }

        public String getType()
        {
            return type;
        }

        public String getName()
        {
            return name;
        }

        public boolean isRootView()
        {
            return rootView;
        }

        public List<ListItem> getListItems()
        {
            return listItems;
        }

        @Override
        public String toString()
        {
            return "ViewDef{" +
                    "id='" + id + '\'' +
                    ", type='" + type + '\'' +
                    ", name='" + name + '\'' +
                    '}';
        }
    }


    public class ListItem
    {


        String text;
        String viewId;
        int level = 1;


        public ListItem(Element element)
        {
            text = element.getAttribute("text");
            viewId = element.getAttribute("viewId");

            String lev = element.getAttribute("level");
            if (lev != null && lev.length() > 0)
                level = Integer.parseInt(lev);

        }

        public String getText()
        {
            return text;
        }

        public String getViewId()
        {
            return viewId;
        }

        public int getLevel()
        {
            return level;
        }

        @Override
        public String toString()
        {
            String ret = "";
            for (int i=1;i<level;i++)
                ret += "    ";

            ret += getText();

            return ret;
        }
    }



    Map<String, ViewDef> views = new LinkedHashMap<>();
    Map<String, ListItem> guideListItems = new LinkedHashMap<>();
    ViewDef rootView = null;

    private static ViewModel instance = new ViewModel();

    public static ViewModel get()
    {
        return instance;
    }


    public ViewModel()
    {
        this(ViewModel.class.getResourceAsStream("/config.xml"));
    }

    public ViewModel(InputStream inputStream)
    {


        try
        {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

            DocumentBuilder builder = factory.newDocumentBuilder();
            Document dom = builder.parse(inputStream);
            Element root = dom.getDocumentElement();

            for (Element element : Xml.getElementsByName(root, "view") )
            {
                ViewDef v = new ViewDef(element);
                views.put(v.getId(), v);

                if (v.isRootView())
                    rootView = v;
            }

            for(Element element1 : Xml.getElements(dom.getElementsByTagName("listItem")))
            {
                ListItem l = new ListItem(element1);

                if(l.getViewId().startsWith("guide."))
                {
                    guideListItems.put(l.getViewId(), l);
                }
            }



        }
        catch (Throwable t)
        {
            t.printStackTrace();
        }
    }

    public Map<String, ViewDef> getViews()
    {
        return views;
    }

    public ViewDef getRootView()
    {
        return rootView;
    }

    public Map<String, ListItem> getGuideListItems()
    {
        return guideListItems;
    }
}
