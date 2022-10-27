package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

import android.app.Activity;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.utils.LogUtility;

import java.util.ArrayList;
import java.util.List;


public class FmStationCRUDImpl extends FirebaseRepository implements FmCRUD {
    public static final String TAG = FmStationCRUDImpl.class.getSimpleName();

    private Activity activity;
    private CollectionReference employeeCollectionReference;

    public FmStationCRUDImpl(Activity activity, String TableName) {
        this.activity = activity;
        employeeCollectionReference = DATABASE.collection(TableName);
    }


    @Override
    public void create(String key, Object model, CallBack callBack) {

    }

    @Override
    public void update(String key, Object model, CallBack callBack) {

    }

    @Override
    public void delete(Object key, CallBack callBack) {

    }

    @Override
    public void queryAllBy(String key, Object model, CallBack callBack) {
        Query query = employeeCollectionReference.orderBy("priority", Query.Direction.DESCENDING);
        readQueryDocuments(query, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                LogUtility.d(TAG, " queryAllBy :  " + object);
                if (object != null) {
                    callBack.onSuccess(getRIDataFromQuerySnapshot(object));
                } else
                    callBack.onSuccess(null);
            }

            @Override
            public void onError(Object object) {
                LogUtility.e(TAG, " queryAllBy :  " + object);
                callBack.onError(object);
            }
        });
    }


    public List<RadioInfo> getRIDataFromQuerySnapshot(Object object) {
        List<RadioInfo> programList = new ArrayList<>();
        QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
        for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
            RadioInfo program = snapshot.toObject(RadioInfo.class);
            if (!program.isDisabled())
                programList.add(program);
        }
        return programList;
    }

}


