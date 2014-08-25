package com.thesarvo.guide;

import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by jon on 25/01/14.
 */
public abstract class Xml
{
    public static Element getFirstElementByName(Element parent, String tag)
    {
        List<Element> els = getElementsByName(parent, tag);
        if (els.size() > 0)
            return els.get(0);
        else
            return null;
    }


    public static List<Element> getElementsByName(Element parent, String tag)
    {
        NodeList nl = parent.getElementsByTagName(tag);
        return getElements(nl);
    }

    public static List<Element> getElements(NodeList nodeList)
    {
        List<Element> ret = new ArrayList<>(nodeList.getLength());
        for (int i=0;i<nodeList.getLength();i++)
        {
            ret.add( (Element) nodeList.item(i));
        }
        return ret;
    }


}
