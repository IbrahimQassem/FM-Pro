package com.sana.dev.fm.utils.my_firebase;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.firebase.firestore.ListenerRegistration;
import com.sana.dev.fm.model.RadioProgram;

import java.util.HashMap;
import java.util.Map;

public interface FmCRUD<T> {
    void create(String key, T model, CallBack callBack);
    void update(String key, T model, CallBack callBack);
    void delete(T key, CallBack callBack);
    void queryAllBy(String key,T model, CallBack callBack);
    void queryAllByKeyValue(@NonNull String field, @Nullable Object value, T model, CallBack callBack);
//    ListenerRegistration readAllEmployeesByDataChangeEvent(CallBack callBack);
//    ListenerRegistration readAllEmployeesByChildEvent(FirebaseChildCallBack firebaseChildCallBack);
}