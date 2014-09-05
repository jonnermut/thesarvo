package com.thesarvo.guide;

import android.app.Activity;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.TextView;

/**
 * Created by Karl on 5/09/2014.
 */
public class SearchResultsAdapter extends ArrayAdapter<IndexEntry>
{

    int layoutResource;
    IndexEntry[] data;

    public SearchResultsAdapter(Context context, int resource, IndexEntry[] objects)
    {
        super(context, resource, objects);

        layoutResource = resource;
        data = objects;
    }


    @Override
    public View getView(int position, View convertView, ViewGroup parent)
    {
        if(convertView == null)
        {
            LayoutInflater inflater = ((Activity) getContext()).getLayoutInflater();
            convertView = inflater.inflate(layoutResource, parent, false);
        }

        IndexEntry entry = data[position];

        TextView textView = (TextView) convertView.findViewById(R.id.textViewItem);
        textView.setText(entry.text);
        textView.setTag(entry.viewId);

        TextView subtitle = (TextView) convertView.findViewById(R.id.placeSubtitle);
        subtitle.setText(entry.viewName);

        return convertView;
    }
}
