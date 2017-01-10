package com.thesarvo.guide;

import android.app.SearchManager;
import android.content.ContentProvider;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.UriMatcher;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteQueryBuilder;
import android.net.Uri;
import android.provider.BaseColumns;
import android.util.Log;

/**
 * Created by Karl on 5/09/2014.
 *
 * URI provider = com.thesarvo.guide.provider
 * main table = main
 * suggesions table = suggestions
 *
 *
 * Contract class not needed as this isn't intended to be used by other apps
 *
 * TODO needs to be a way to re-index in app via options etc
 */
public class IndexContentProvider extends ContentProvider
{
    private MainDatabaseHelper mOpenHelper;

    public static final String DBNAME = "index";
    public static final String MAIN_TABLE = "main";
    private static final int MAIN_TABLE_I = 1;
    public static final String SUGESTIONS_TABLE = "suggesions";
    private static final int SUGGESTIONS_TABLE_I = 2;
    private static final String SINGLE_ROW = "/#";
    private static final int MAIN_TABLE_SINGLE = 3;
    private static final int SUGGEST_TABLE_SINGLE = 4;
    private static final int SUGGEST_REQUEST = 5;

    public static final String MAP_TABLE = "maps";
    private static final int MAP_TABLE_I = 6;
    private static final int MAP_TABLE_SINGLE = 7;


    public static final String COL_ID = "_id";
    public static final String COL_TEXT = "TEXT";
    public static final String COL_VIEW_ID = "VIEW_ID";
    public static final String COL_VIEW_NAME = "VIEW_NAME";
    public static final String COL_ELEMENT_ID = "ELEMENT_ID";
    public static final String COL_TYPE = "TYPE";

    public static final String COL_GPS_ID = "GPS_ID"; //this is the XML id in <gps>, not the unique key
    public static final String COL_LAT = "LATITUDE";
    public static final String COL_LNG = "LONGITUDE";
    public static final String COL_DESC = "DESCRIPTION";
    public static final String COL_CODE = "CODE";

    public static final String AUTHORITY = "com.thesarvo.guide.provider";


    private SQLiteDatabase db;

    //not sure if code is right here
    private static final UriMatcher matcher = new UriMatcher(0);

    @Override
    public boolean onCreate()
    {
        Context context = getContext();

        /*
         * Creates a new helper object. This method always returns quickly.
         * Notice that the database itself isn't created or opened
         * until SQLiteOpenHelper.getWritableDatabase is called
         */

        mOpenHelper = new MainDatabaseHelper(
                context,        // the application context
                DBNAME,              // the name of the database)
                context.getApplicationInfo().dataDir + "/databases"
        );

        matcher.addURI(AUTHORITY, MAIN_TABLE, MAIN_TABLE_I);
        matcher.addURI(AUTHORITY, SUGESTIONS_TABLE, SUGGESTIONS_TABLE_I);
        matcher.addURI(AUTHORITY, MAP_TABLE, MAP_TABLE_I);
        matcher.addURI(AUTHORITY, MAIN_TABLE+SINGLE_ROW, MAIN_TABLE_SINGLE);
        matcher.addURI(AUTHORITY, SUGESTIONS_TABLE+SINGLE_ROW, SUGGEST_TABLE_SINGLE);
        matcher.addURI(AUTHORITY, MAP_TABLE+SINGLE_ROW, MAP_TABLE_SINGLE);
        matcher.addURI(AUTHORITY, SearchManager.SUGGEST_URI_PATH_QUERY + "/*", SUGGEST_REQUEST);


        return true;
    }

    @Override
    public Cursor query(Uri uri,
                        String[] projection,
                        String selection,
                        String[] selectionArgs,
                        String sortOrder)
    {
        db = mOpenHelper.getWritableDatabase();
        SQLiteQueryBuilder qBuilder = new SQLiteQueryBuilder();

        //check which table we're querying to
        int table = matcher.match(uri);
        switch (table)
        {
            case MAIN_TABLE_I:
                selection = COL_TEXT + " LIKE '%" + selection + "%'";
            case MAIN_TABLE_SINGLE:
                qBuilder.setTables(MAIN_TABLE);
                break;

            case SUGGEST_REQUEST:
                selection = uri.getLastPathSegment().toLowerCase();
                selection = SearchManager.SUGGEST_COLUMN_TEXT_1 + " LIKE '%" + selection + "%'";
            case SUGGESTIONS_TABLE_I:
            case SUGGEST_TABLE_SINGLE:
                qBuilder.setTables(SUGESTIONS_TABLE);
                break;

            case MAP_TABLE_I:
            case MAP_TABLE_SINGLE:
                qBuilder.setTables(MAP_TABLE);
                break;

            default:
                Log.d("Content query", "URI not matched!");
                return null;
        }

        //check for getting a single row
        if(table == SUGGEST_TABLE_SINGLE || table == MAIN_TABLE_SINGLE || table ==  MAP_TABLE_SINGLE)
        {
            qBuilder.appendWhere(COL_ID + "=" + uri.getLastPathSegment());
        }

        Cursor c = qBuilder.query(db,
                projection,
                selection,
                selectionArgs,
                null,   //TODO, might want to do something different here at some point
                null,
                sortOrder);

        c.setNotificationUri(getContext().getContentResolver(), uri);

        return c;
    }

    @Override
    public Uri insert(Uri uri, ContentValues contentValues)
    {
        //check which table we're witting to
        int table = matcher.match(uri);
        String tableS = "";
        db = mOpenHelper.getWritableDatabase();
        //Uri result;
        Long result;

        switch (table)
        {
            case MAIN_TABLE_I:
                result = db.insert(MAIN_TABLE, null, contentValues);
                break;

            case SUGGESTIONS_TABLE_I:
                result = db.insert(SUGESTIONS_TABLE, null, contentValues);
                break;

            case MAP_TABLE_I:
                result = db.insert(MAP_TABLE, null, contentValues);
                break;

            default:
                Log.d("Content insert", "URI not matched!");
                return null;
        }

        return ContentUris.appendId(uri.buildUpon(), result).build();
    }

    @Override
    public int delete(Uri uri, String s, String[] strings)
    {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues contentValues, String s, String[] strings)
    {
        return 0;
    }

    @Override
    /**
     * Since this won't be used by external apps we don't need this
     */
    public String getType(Uri uri)
    {
        return null;
    }


    // A string that defines the SQL statement for creating a table
    private static final String SQL_CREATE_MAIN = "CREATE TABLE " +
            "main" +                       // Table's name
            "(" +                           // The columns in the table
            " _id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            " TEXT TEXT, "  +
            " VIEW_ID TEXT, " +
            " VIEW_NAME TEXT, " +
            " ELEMENT_ID TEXT, " +
            " TYPE INTEGER)";

    private static final String SQL_CREATE_SUGGEST = "CREATE TABLE " +
            SUGESTIONS_TABLE +
            "(" +
            BaseColumns._ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
            SearchManager.SUGGEST_COLUMN_TEXT_1 + " TEXT, "  +//main text
            SearchManager.SUGGEST_COLUMN_TEXT_2 + " TEXT, " + //subtitle
            //SearchManager.SUGGEST_COLUMN_INTENT_DATA + " TEXT" +  //not needed, can define in xml
            SearchManager.SUGGEST_COLUMN_INTENT_DATA_ID  + " TEXT" + ")";

    private static final String SQL_CREATE_MAP = "CREATE TABLE " +
            MAP_TABLE +
            "(" +
            COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
            COL_GPS_ID + " TEXT, " +
            COL_LAT + " REAL, " +
            COL_LNG + " REAL, " +
            COL_DESC + " TEXT, " +
            COL_CODE + " TEXT)";

}
