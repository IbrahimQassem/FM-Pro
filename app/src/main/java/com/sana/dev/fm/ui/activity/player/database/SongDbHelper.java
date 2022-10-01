package com.sana.dev.fm.ui.activity.player.database;


import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;


public class SongDbHelper extends SQLiteOpenHelper {
    private static final String DBNAME="allsongs.db";
    private static final int VERSION=1;
    private Context mContext;
    public SongDbHelper(Context context) {
        super(context, DBNAME, null, VERSION);
        mContext=context;
    }

    @Override
    public void onCreate(SQLiteDatabase sqLiteDatabase) {
        sqLiteDatabase.execSQL(queryTocreateRecentHistory());
    }

    @Override
    public void onUpgrade(SQLiteDatabase sqLiteDatabase, int i, int i1) {

    }

    public String queryTocreateRecentHistory() {
        return "create table "+DbSchema.RecentHistory.TABLE_NAME+ "( "+
                "_id integer primary key autoincrement,"+
                DbSchema.RecentHistory.Cols.ID + ", "+
                DbSchema.RecentHistory.Cols.TIME_PLAYED + ")";
    }

}