package com.sana.dev.fm.utils.my_firebase;

import com.google.firebase.firestore.ListenerRegistration;
import com.sana.dev.fm.model.RadioProgram;

import java.util.HashMap;
import java.util.Map;

public interface FmCRUD<T> {
    void create(String key, T model, CallBack callBack);
    void update(String key, T model, CallBack callBack);
    void delete(T key, CallBack callBack);
    void queryAllBy(String key,T model, CallBack callBack);
//    ListenerRegistration readAllEmployeesByDataChangeEvent(CallBack callBack);
//    ListenerRegistration readAllEmployeesByChildEvent(FirebaseChildCallBack firebaseChildCallBack);
}