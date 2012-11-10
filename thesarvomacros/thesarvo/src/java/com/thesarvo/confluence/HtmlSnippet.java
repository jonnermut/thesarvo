///*
// * Created on 3/01/2005
// * author jnermut
// */
//package com.thesarvo.confluence;
//
//import java.io.IOException;
//import java.io.InputStreamReader;
//import java.io.StringWriter;
//
//import javax.servlet.http.HttpServletRequest;
//
//import org.apache.commons.httpclient.HttpMethod;
//import org.radeox.macro.parameter.MacroParameter;
//
//import com.atlassian.confluence.core.ContentEntityObject;
//import com.atlassian.confluence.renderer.radeox.macros.MacroUtils;
//import com.atlassian.confluence.renderer.radeox.macros.include.AbstractHttpRetrievalMacro;
//import com.opensymphony.module.sitemesh.Page;
//import com.opensymphony.module.sitemesh.parser.FastPageParser;
//import com.opensymphony.util.TextUtils;
//import com.opensymphony.webwork.ServletActionContext;
//
///**
// * HtmlSnippet
// *
// * @author jnermut
// *
// */
//public class HtmlSnippet extends AbstractHttpRetrievalMacro
//{
//
//    public HtmlSnippet()
//    {
//    }
//
//    public String getName()
//    {
//        return "html-snippet";
//    }
//
//    public String[] getParamDescription()
//    {
//        return myParamDescription;
//    }
//
//    public String getHtml(MacroParameter macroParameter)
//        throws IllegalArgumentException, IOException
//    {
//    	ContentEntityObject contentObject = MacroUtils.getContentEntityObject(macroParameter);
//    	String pageUrl = contentObject.getUrlPath();
//    	final HttpServletRequest request = ServletActionContext.getRequest();
//    	pageUrl = "http://" + request.getServerName() + ( request.getServerPort()!=80? ( ":" + request.getServerPort() ):"" )  + pageUrl;
//    	
//        String url = TextUtils.noNull(macroParameter.get("url", 0)).trim();
//        String start = TextUtils.noNull(macroParameter.get("start", 0)).trim();
//        String end = TextUtils.noNull(macroParameter.get("end", 0)).trim();
//        
//        String body = "Could not get content";  
//        	
//        try
//		{
//        	body = fetchPageContent(url, macroParameter);
//		}
//        catch (Exception e)
//		{}
//        
//        String ret = body;
//        
//        if (start!=null && start.length()>0)
//        {
//        	int i = ret.indexOf(start);
//        	if (i>=0)
//        		ret = ret.substring(i+ start.length());
//        }
//
//        if (end!=null && end.length()>0)
//        {
//        	int i = ret.indexOf(end);
//        	if (i>=0)
//        		ret = ret.substring(0,i);
//        }
//        
//        ret = "<base href='" + url + "'>" + ret + "<base href='" + pageUrl + "'>"; 
//        return ret;
//    }
//
//    protected String fetchPageContent(String url, MacroParameter macroParameter)
//        throws IOException
//    {
//        StringWriter writer;
//        HttpMethod method = retrieveRemoteUrl(url);
//        FastPageParser parser = new FastPageParser();
//        Page p = parser.parse(new InputStreamReader(method.getResponseBodyAsStream()));
//        method.releaseConnection();
//        writer = new StringWriter();
//        p.writeBody(writer);
//        return writer.toString();
//        
//    }
//
//    private String myParamDescription[] = {
//        "1: url","2: start","3: end"
//    };
//	
//}
