package com.thesarvo.guide;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;

import com.readystatesoftware.sqliteasset.SQLiteAssetHelper;

/**
 * Helper class that actually creates and manages the provider's underlying data repository.
 */
final class MainDatabaseHelper extends SQLiteAssetHelper
{

    /*
     * Instantiates an open helper for the provider's SQLite data repository
     * Do not do database creation and upgrade here.
     */
    MainDatabaseHelper(Context context, String dbName) {
        super(context, dbName, null, 1);
    }

    /*
             * Creates the data repository. This is called when the provider attempts to open the
             * repository and SQLite reports that it doesn't exist.
             */
    /*public void onCreate(SQLiteDatabase db) {

        // Creates the main table
        db.execSQL(SQL_CREATE_MAIN);
        db.execSQL(SQL_CREATE_SUGGEST);
        db.execSQL(SQL_CREATE_MAP);
        Log.d("Table Helper", "Tables created");
    }*/

    @Override
    public void onUpgrade(SQLiteDatabase sqLiteDatabase, int i, int i2)
    {

    }
}
