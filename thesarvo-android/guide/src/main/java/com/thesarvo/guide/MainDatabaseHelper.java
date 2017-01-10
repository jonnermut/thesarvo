package com.thesarvo.guide;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.readystatesoftware.sqliteasset.SQLiteAssetHelper;

import java.io.File;

/**
 * Helper class that actually creates and manages the provider's underlying data repository.
 */
final class MainDatabaseHelper extends SQLiteAssetHelper
{

    /*
     * Instantiates an open helper for the provider's SQLite data repository
     * Do not do database creation and upgrade here.
     */
    MainDatabaseHelper(Context context, String dbName, String storageDirectory)
    {
        super(context, dbName, storageDirectory, null, 1);

        try
        {
            // in our world, where we provide a fully formed and up to date DB in the assets file,
            // if we have a newer file in out assets than on disk, then blow away the file on disk
            // this will get recreated by the super class

            File onDiskfile = new File (storageDirectory + "/" + dbName);

            if (onDiskfile.exists() && onDiskfile.lastModified() < BuildConfig.DB_ASSET_LASTMOD)
            {
                onDiskfile.delete();
            }
        }
        catch (Throwable t)
        {
            Log.e("MainDatabaseHelper", "Error deleting old DB", t);
        }
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
