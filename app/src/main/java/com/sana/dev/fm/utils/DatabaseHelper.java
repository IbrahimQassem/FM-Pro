package com.sana.dev.fm.utils;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.sana.dev.fm.model.RadioProgram;

import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "programs_db";
    private static final int DATABASE_VERSION = 1;

    // Table name
    private static final String TABLE_PROGRAMS = "programs";

    // Column names
    private static final String KEY_ID = "id";
    private static final String KEY_NAME = "name";
    private static final String KEY_DESCRIPTION = "description";
    private static final String KEY_CATEGORY = "category";
    private static final String KEY_START_DATE = "start_date";
    private static final String KEY_END_DATE = "end_date";
    private static final String KEY_IS_ACTIVE = "is_active";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String CREATE_PROGRAMS_TABLE = "CREATE TABLE " + TABLE_PROGRAMS + "("
                + KEY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT,"
                + KEY_NAME + " TEXT,"
                + KEY_DESCRIPTION + " TEXT,"
                + KEY_CATEGORY + " TEXT,"
                + KEY_START_DATE + " INTEGER,"
                + KEY_END_DATE + " INTEGER,"
                + KEY_IS_ACTIVE + " INTEGER"
                + ")";
        db.execSQL(CREATE_PROGRAMS_TABLE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_PROGRAMS);
        onCreate(db);
    }

    public boolean addProgram(RadioProgram program) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();

        values.put(KEY_NAME, program.getPrName());
        values.put(KEY_DESCRIPTION, program.getPrDesc());
        values.put(KEY_CATEGORY, program.getPrCategoryList().toString());
        values.put(KEY_START_DATE, program.getProgramScheduleTime().getDateStart());
        values.put(KEY_END_DATE, program.getProgramScheduleTime().getDateEnd());
        values.put(KEY_IS_ACTIVE, program.isDisabled() ? 1 : 0);

        long result = db.insert(TABLE_PROGRAMS, null, values);
        return result != -1;
    }

    public List<RadioProgram> getAllPrograms() {
        List<RadioProgram> programList = new ArrayList<>();
        String selectQuery = "SELECT * FROM " + TABLE_PROGRAMS;

        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery(selectQuery, null);

        if (cursor.moveToFirst()) {
            do {
//                RadioProgram program = new RadioProgram(
//                        cursor.getInt(cursor.getColumnIndex(KEY_ID)),
//                        cursor.getString(cursor.getColumnIndex(KEY_NAME)),
//                        cursor.getString(cursor.getColumnIndex(KEY_DESCRIPTION)),
//                        cursor.getString(cursor.getColumnIndex(KEY_CATEGORY)),
//                        new Date(cursor.getLong(cursor.getColumnIndex(KEY_START_DATE))),
//                        new Date(cursor.getLong(cursor.getColumnIndex(KEY_END_DATE))),
//                        cursor.getInt(cursor.getColumnIndex(KEY_IS_ACTIVE)) == 1
//                );
//                programList.add(program);
            } while (cursor.moveToNext());
        }
        cursor.close();
        return programList;
    }

    public boolean updateProgram(RadioProgram program) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();

        values.put(KEY_NAME, program.getPrName());
        values.put(KEY_DESCRIPTION, program.getPrDesc());
//        values.put(KEY_CATEGORY, program.getCategory());
//        values.put(KEY_START_DATE, program.getStartDate().getTime());
//        values.put(KEY_END_DATE, program.getEndDate().getTime());
        values.put(KEY_IS_ACTIVE, !program.isDisabled() ? 1 : 0);

        int result = db.update(TABLE_PROGRAMS, values, KEY_ID + " = ?",
                new String[]{String.valueOf(program.getProgramId())});
        return result > 0;
    }

    public boolean deleteProgram(int id) {
        SQLiteDatabase db = this.getWritableDatabase();
        int result = db.delete(TABLE_PROGRAMS, KEY_ID + " = ?",
                new String[]{String.valueOf(id)});
        return result > 0;
    }

    public RadioProgram getProgram(int id) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.query(TABLE_PROGRAMS, null, KEY_ID + " = ?",
                new String[]{String.valueOf(id)}, null, null, null);

//        if (cursor != null && cursor.moveToFirst()) {
//            RadioProgram program = new RadioProgram(
//                    cursor.getInt(cursor.getColumnIndex(KEY_ID)),
//                    cursor.getString(cursor.getColumnIndex(KEY_NAME)),
//                    cursor.getString(cursor.getColumnIndex(KEY_DESCRIPTION)),
//                    cursor.getString(cursor.getColumnIndex(KEY_CATEGORY)),
//                    new Date(cursor.getLong(cursor.getColumnIndex(KEY_START_DATE))),
//                    new Date(cursor.getLong(cursor.getColumnIndex(KEY_END_DATE))),
//                    cursor.getInt(cursor.getColumnIndex(KEY_IS_ACTIVE)) == 1
//            );
            cursor.close();
//            return program;
//        }
        return null;
    }
}