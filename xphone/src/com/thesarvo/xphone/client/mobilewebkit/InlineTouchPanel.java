/*
 * Copyright 2007 Google Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.thesarvo.xphone.client.mobilewebkit;

import com.google.gwt.dom.client.Node;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.ui.ComplexPanel;
import com.google.gwt.user.client.ui.HasText;
import com.google.gwt.user.client.ui.InsertPanel;
import com.google.gwt.user.client.ui.Widget;

/**
 * A panel that formats its child widgets using the default HTML layout
 * behavior.
 * 
 * <p>
 * <img class='gallery' src='doc-files/FlowPanel.png'/>
 * </p>
 */
public class InlineTouchPanel extends ComplexPanel implements InsertPanel, HasTouchManager, HasTransitionEndHandlers, HasAnimationEndHandlers, HasText
{

	TouchManager touchManager = null;
	
	/**
	 * Creates an empty flow panel.
	 */
	public InlineTouchPanel()
	{
		setElement(DOM.createSpan());
		
		touchManager = new TouchManager(this);
	}

	/**
	 * Adds a new child widget to the panel.
	 * 
	 * @param w
	 *            the widget to be added
	 */
	@Override
	public void add(Widget w)
	{
		add(w, getElement());
	}

	@Override
	public void clear()
	{
		// Remove all existing child nodes.
		Node child = getElement().getFirstChild();
		while (child != null)
		{
			getElement().removeChild(child);
			child = getElement().getFirstChild();
		}
	}

	/**
	 * Inserts a widget before the specified index.
	 * 
	 * @param w
	 *            the widget to be inserted
	 * @param beforeIndex
	 *            the index before which it will be inserted
	 * @throws IndexOutOfBoundsException
	 *             if <code>beforeIndex</code> is out of range
	 */
	public void insert(Widget w, int beforeIndex)
	{
		insert(w, getElement(), beforeIndex, true);
	}
	
	
	@Override
	public HandlerRegistration addTransitionEndHandler(
			TransitionEndHandler handler)
	{
		
		return addDomHandler(handler, TransitionEndEvent.getType());
	}

	@Override
	public HandlerRegistration addAnimationEndHandler(
			AnimationEndHandler handler)
	{
		com.thesarvo.xphone.client.util.Logger.debug("InlineTouchPanel.addAnimationEndHandler()");
		return addDomHandler(handler, AnimationEndEvent.getType());
	}

	public void setText(String string)
	{
		getElement().setInnerText(string);
	}

	/**
	 * @return the touchManager
	 */
	public TouchManager getTouchManager()
	{
		return touchManager;
	}

	/**
	 * @param touchManager the touchManager to set
	 */
	public void setTouchManager(TouchManager touchManager)
	{
		this.touchManager = touchManager;
	}

	@Override
	public String getText()
	{
		return getElement().getInnerText();
	}

}