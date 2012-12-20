package com.thesarvo.guide.client.phototopo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class PointGroup
{
	List<RoutePoint> points = new ArrayList<RoutePoint>();
	double x, y;
	PhotoTopo phototopo;

	/**
	 * @private stores the collection of points that are in the same location
	 * @constructor
	 * @param {Point} point The first point in this group
	 */
	PointGroup(RoutePoint point)
	{
		phototopo = point.route.getPhototopo();
		points.add(point);

		// these coords may get changed imediately after creation
		this.x = point.x;
		this.y = point.y;
	}

	/**
	 * add another point to an existing pointGroup
	 * 
	 * @param {Point} point the point to add
	 */
	void add(RoutePoint point)
	{
		int c;

		this.points.add(point);
		this.sort();
		if (phototopo.isLoading())
		{
			return;
		}
		for (c = 0; c < this.points.size(); c++)
		{
			this.points.get(c).updateLabelPosition();
		}
	};

	void sort()
	{
//		Collections.sort(points, new Comparator<RoutePoint>()
//		{
//
//			@Override
//			public int compare(RoutePoint o1, RoutePoint o2)
//			{
//
//				return o1.route.getOrder() > o2.route.getOrder() ? 1 : -1;
//
//			}
//		});

	};

	/**
	 * gets the points order in this group points have a natural order which is
	 * typically the order the routes are shown in the guide (eg left to right)
	 */
	int getLabelPosition(RoutePoint point)
	{
		int c, pos = 0;

		for (c = 0; c < this.points.size(); c++)
		{

			// only count points that have a visible label
			if (this.points.get(c).labelElement != null)
			{
				pos++;
			}
			if (this.points.get(c) == point)
			{
				return c;
			}
		}
		return 0;
	};

	/*
	 * return the amount the curve should be offset when multiple curves overlap
	 */
	int getSplitOffset(RoutePoint point)
	{
		int c, ret;

		for (c = 0; c < this.points.size(); c++)
		{
			if (this.points.get(c) == point)
			{
				ret = (1 - this.points.size()) / 2 + c;
				return ret;
			}
		}
		return 0;
	};

	/*
	 * the point has moved so redraw all connected paths
	 */
	void redraw(RoutePoint point)
	{
		int c;
		for (c = 0; c < this.points.size(); c++)
		{
			RoutePoint p = this.points.get(c);
			if (p.nextPath != null)
			{
				p.nextPath.redraw();
			}
			if (p.prevPath != null)
			{
				p.prevPath.redraw();
			}
		}
	};

	/*
	 * 
	 */
	void remove(RoutePoint point)
	{
		int c;
		points.remove(point);

		if (this.points.size() == 0)
		{
			phototopo.getPointGroups().remove(this);

		}
		for (c = 0; c < this.points.size(); c++)
		{
			this.points.get(c).updateLabelPosition();
		}
	};

	/*
	 * returns the x/y coords of the cubic bezier curve that should come out of
	 * this point just make them negative to get the handle for the opposite end
	 * of the cubic curve a simplistic algortith just averages them all, a more
	 * complex one takes into account which routes actually merge or don't
	 */
	public SimplePoint getAngle(RoutePoint point1)
	{
		// for each point get the diff of it and the next point and the previous
		// point and add them all together
		// then find that angle and scale the point to the shortest path segment
		// length

		int c;
		double dx = 0, dy = 0, ddx = 0, ddy = 0,

		sqr, minSqr = 1000000, angle, dist;

		for (c = 0; c < this.points.size(); c++)
		{
			RoutePoint p = this.points.get(c);
			if (p.nextPoint != null)
			{
				dx = (p.nextPoint.x - p.x);
				dy = (p.nextPoint.y - p.y);
				sqr = dx * dx + dy * dy;
				if (sqr < minSqr)
				{
					minSqr = sqr;
				}
				ddx += dx;
				ddy += dy;
			}
			if (p.prevPoint != null)
			{
				dx = (p.prevPoint.x - p.x);
				dy = (p.prevPoint.y - p.y);
				sqr = dx * dx + dy * dy;
				if (sqr < minSqr)
				{
					minSqr = sqr;
				}
				ddx -= dx;
				ddy -= dy;
			}
		}

		angle = Math.atan2(ddx, ddy);
		dist = Math.sqrt(minSqr) * 0.4;

		ddx = dist * Math.sin(angle);
		ddy = dist * Math.cos(angle);

		return new SimplePoint(ddx, ddy);
	};

}
