package com.thesarvo.guide

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.widget.TextView

import com.github.johnkil.print.PrintView
import com.unnamed.b.atv.model.TreeNode

/**
 * Created by jon on 1/01/2017.
 */

class NodeViewHolder(context: Context) : TreeNode.BaseNodeViewHolder<Guide>(context)
{
    private val tvValue: TextView? = null
    private var arrowView: PrintView? = null
    private var disclosureView: PrintView? = null

    override fun createNodeView(node: TreeNode, value: Guide): View
    {
        val viewId = value.viewIdOrId
        val inflater = LayoutInflater.from(context)
        val view = inflater.inflate(R.layout.layout_node, null, false)
        val tvValue = view.findViewById<View>(R.id.node_value) as TextView
        tvValue.text = value.title

        arrowView = view.findViewById<View>(R.id.icon) as PrintView
        disclosureView = view.findViewById<View>(R.id.disclosure) as PrintView

        val level = node.level
        val levelToUse = level + (value.level ?: 1) - 2
        tvValue.setPadding(64 * levelToUse, 0, 0, 0)

        if (!value.hasChildren)
        {

            arrowView?.visibility = View.GONE


            if (viewId.isNotEmpty())
            {
                disclosureView?.visibility = View.VISIBLE
                disclosureView?.iconText = context.resources.getString(R.string.ic_keyboard_arrow_right)
            }
            view.setBackgroundColor(context.resources.getColor(R.color.colorPrimary))


        }
        else
        {
            arrowView?.iconText = context.resources.getString(R.string.ic_keyboard_arrow_right)
            //arrowView.setIconText(context.getResources().getString(value.icon));
            view.setBackgroundColor(context.resources.getColor(R.color.colorPrimaryDark))
        }

        return view
    }

    override fun toggle(active: Boolean)
    {
        arrowView?.iconText = context.resources.getString(if (active) R.string.ic_keyboard_arrow_down else R.string.ic_keyboard_arrow_right)
    }

}
