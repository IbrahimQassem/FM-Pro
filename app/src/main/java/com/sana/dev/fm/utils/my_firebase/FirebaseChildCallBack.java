package com.sana.dev.fm.utils.my_firebase;

public abstract class FirebaseChildCallBack {

    public abstract void onChildAdded(Object object);

    public abstract void onChildChanged(Object object);

    public abstract void onChildRemoved(Object object);

    public abstract void onCancelled(Object object);
}
