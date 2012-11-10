package com.thesarvo.xphone.client.event;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.event.shared.GwtEvent.Type;

/**
 * Handles events for an application
 * 
 * @author jnermut
 *
 */
public interface EventBus
{

	/**
	 * Adds a handler.
	 * 
	 * @param <H>
	 *            The type of handler
	 * @param type
	 *            the event type associated with this handler
	 * @param handler
	 *            the handler
	 * @return the handler registration, can be stored in order to remove the
	 *         handler later
	 */
	public <H extends EventHandler> HandlerRegistration addHandler(
			GwtEvent.Type<H> type, final H handler);

	/**
	 * Fires the given event to the handlers listening to the event's type.
	 * 
	 * 
	 * @param event the event
	 */
	public void fireEvent(GwtEvent<?> event);

	/**
	 * Does this handler manager handle the given event type?
	 * 
	 * @param e the event type
	 * @return whether the given event type is handled
	 */
	public boolean isEventHandled(Type<?> e);

	/**
	 * Removes the given handler from the specified event type. Normally,
	 * applications should call {@link HandlerRegistration#removeHandler()}
	 * instead.
	 * 
	 * @param <H> handler type
	 * @param type the event type
	 * @param handler the handler
	 */
	public <H extends EventHandler> void removeHandler(GwtEvent.Type<H> type,
			final H handler);
}