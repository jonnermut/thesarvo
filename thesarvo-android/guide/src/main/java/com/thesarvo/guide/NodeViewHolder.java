package com.thesarvo.guide;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;

import com.github.johnkil.print.PrintView;
import com.unnamed.b.atv.model.TreeNode;

/**
 * Created by jon on 1/01/2017.
 */

public class NodeViewHolder extends TreeNode.BaseNodeViewHolder<ViewModel.ListItem>
{
    private TextView tvValue;

    public NodeViewHolder(Context context)
    {
        super(context);
    }
    private PrintView arrowView;
    private PrintView disclosureView;

    @Override
    public View createNodeView(TreeNode node, ViewModel.ListItem value)
    {
        final LayoutInflater inflater = LayoutInflater.from(context);
        final View view = inflater.inflate(R.layout.layout_node, null, false);
        TextView tvValue = (TextView) view.findViewById(R.id.node_value);
        tvValue.setText(value.getText());

        arrowView = (PrintView) view.findViewById(R.id.icon);
        disclosureView = (PrintView) view.findViewById(R.id.disclosure);
        if (value.isLeaf())
        {
            arrowView.setVisibility(View.GONE);

            if (value.getViewId() != null && value.getViewId().length() > 0)
            {
                disclosureView.setVisibility(View.VISIBLE);
                disclosureView.setIconText(context.getResources().getString(R.string.ic_keyboard_arrow_right));
            }
            view.setBackgroundColor(context.getResources().getColor(R.color.colorPrimary));
            tvValue.setPadding(64 * value.getLevel(),0,0,0);

        }
        else
        {
            arrowView.setIconText(context.getResources().getString(R.string.ic_keyboard_arrow_right));
            //arrowView.setIconText(context.getResources().getString(value.icon));
            view.setBackgroundColor(context.getResources().getColor(R.color.colorPrimaryDark));
        }

        return view;
    }

    @Override
    public void toggle(boolean active)
    {
        arrowView.setIconText(context.getResources().getString(active ? R.string.ic_keyboard_arrow_down : R.string.ic_keyboard_arrow_right));
    }

    /*
    @Override
    public int getContainerStyle() {
        return R.style.TreeNodeStyleCustom;
    }

    @Override
    public void toggleSelectionMode(boolean editModeEnabled) {
        nodeSelector.setVisibility(editModeEnabled ? View.VISIBLE : View.GONE);
        nodeSelector.setChecked(mNode.isSelected());
    }
    */
}
