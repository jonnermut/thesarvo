//package com.thesarvo.guide;
//
//import android.content.ContentResolver;
//import android.database.Cursor;
//import android.net.Uri;
//import android.os.AsyncTask;
//import android.util.Log;
//
//import com.google.android.gms.maps.model.LatLng;
//
//import java.util.ArrayList;
//import java.util.List;
//
///**
// * Created by jon on 28/12/2016.
// */
//class CreateMapsIndex extends AsyncTask<Void, Void, Void>
//{
//    private GuideApplication guideApplication;
//
//    public CreateMapsIndex(GuideApplication guideApplication)
//    {
//        this.guideApplication = guideApplication;
//    }
//
//    @Override
//    protected Void doInBackground(Void... voids)
//    {
//        List<GPSNode> nodes = MapsFragment.getGPSPoints();
//
//        Uri.Builder builder = new Uri.Builder();
//        builder.scheme(ContentResolver.SCHEME_CONTENT);
//        builder.authority(IndexContentProvider.AUTHORITY);
//        builder.path(IndexContentProvider.MAP_TABLE);
//
//        //getting all is inefficient, but we can do this async and we do need all that data
//        Cursor cursor = guideApplication.getContentResolver().query(builder.build(), null, null, null, null);
//
//        if (cursor == null || cursor.getCount() < 1)
//        {
//            Log.d("Creating maps index", "something went wrong getting cursor!");
//            return null;
//        }
//
//        int id = -1;
//        GPSNode current;
//        List<Point> points = new ArrayList<>(); //new will never get used but is needed for compliation
//
//        while (cursor.moveToNext())
//        {
//            String sID = cursor.getString(cursor.getColumnIndex(IndexContentProvider.COL_GPS_ID));
//            int newID = Integer.valueOf(sID);
//
//            //start a new GPS node if necessary, should aways happen on first run
//            if (newID != id)
//            {
//                points = new ArrayList<>();
//                current = new GPSNode(sID, points);
//                nodes.add(current);
//                id = newID;
//            }
//
//            double lat = cursor.getDouble(cursor.getColumnIndex(IndexContentProvider.COL_LAT));
//            double lng = cursor.getDouble(cursor.getColumnIndex(IndexContentProvider.COL_LNG));
//            String desc = cursor.getString(cursor.getColumnIndex(IndexContentProvider.COL_DESC));
//            String code = cursor.getString(cursor.getColumnIndex(IndexContentProvider.COL_CODE));
//
//            points.add(new Point(new LatLng(lat, lng), desc, code));
//        }
//
//
//        return null;
//    }
//
//    @Override
//    protected void onPostExecute(Void aVoid)
//    {
//        super.onPostExecute(aVoid);
//        guideApplication.mapsIndexed = true;
//        Log.d("Map Index", "Map index data created");
//    }
//
//    @Override
//    protected void onProgressUpdate(Void... values)
//    {
//        super.onProgressUpdate(values);
//    }
//}
