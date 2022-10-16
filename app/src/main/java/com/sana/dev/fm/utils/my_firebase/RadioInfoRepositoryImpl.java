package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

import android.app.Activity;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.RadioInfo;

import java.util.ArrayList;
import java.util.List;


public class RadioInfoRepositoryImpl extends FirebaseRepository implements RadioInfoRepository {

    private Activity activity;
    private CollectionReference employeeCollectionReference;

    public RadioInfoRepositoryImpl(Activity activity, String TableName) {
        this.activity = activity;
        employeeCollectionReference = DATABASE.collection(TableName);
    }


    @Override
    public void readAllRadioByEvent(final CallBack callBack) {
//        progressDialog.showDialog(getString(R.string.loading), getString(R.string.please_wait));
        //get all employees order by employee name
//        Query query = employeeCollectionReference.whereEqualTo("disabled", false).orderBy("priority", Query.Direction.DESCENDING);
//        Query query = employeeCollectionReference.whereEqualTo("disabled", false).orderBy("priority", Query.Direction.DESCENDING);
        Query query = employeeCollectionReference.orderBy("priority", Query.Direction.DESCENDING);
        readQueryDocuments(query, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                if (object != null) {
                    callBack.onSuccess(getRIDataFromQuerySnapshot(object));
                } else
                    callBack.onSuccess(null);
            }

            @Override
            public void onError(Object object) {
                callBack.onError(object);
            }
        });
    }

    private String getString(int id) {
        return activity.getString(id);
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


interface RadioInfoRepository {
    void readAllRadioByEvent(CallBack callBack);
}