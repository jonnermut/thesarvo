package com.thesarvo.guide.client.phototopo;

import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.Element;
import com.google.gwt.user.client.Event;
import com.google.gwt.user.client.ui.FlexTable;

public class LegendTable extends FlexTable
{
    Legend legend;
    
    LegendTable() {
        setStyleName("pm-LegendTable");
        sinkEvents(Event.ONMOUSEOVER |Event.ONMOUSEOUT); 
    }

    // this is so that we can detect mouse-over and mouse-out events on the FlexTable (not supported by default)
    // there may be a better / faster way to do this...
    @Override
    public void onBrowserEvent(Event event) {
        super.onBrowserEvent(event);
                
        Element td = getEventTargetCell(event);
        if (td == null) return;
        Element tr = DOM.getParent(td);
        switch (DOM.eventGetType(event)) {
            case Event.ONMOUSEOVER: {
            	legend.onMouseOver(tr);
                break;
            }
            case Event.ONMOUSEOUT: {
            	legend.onMouseOut(tr);
                break;
            }
        }
    }
}