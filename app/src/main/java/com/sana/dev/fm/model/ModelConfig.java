package com.sana.dev.fm.model;

public class ModelConfig {
    private int icon;
    private String title;
    private String desc;
    private boolean cancellable;
    private transient ButtonConfig btnCancel;
    private transient ButtonConfig btnConfirm;
    private int viewType;

    public ModelConfig(int icon, String title, String desc, ButtonConfig btnCancel, ButtonConfig btnConfirm) {
        this.icon = icon;
        this.title = title;
        this.desc = desc;
        this.btnCancel = btnCancel;
        this.btnConfirm = btnConfirm;
    }

    public int getIcon() {
        return icon;
    }

    public void setIcon(int icon) {
        this.icon = icon;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public boolean isCancellable() {
        return cancellable;
    }

    public void setCancellable(boolean cancellable) {
        this.cancellable = cancellable;
    }

    public ButtonConfig getBtnCancel() {
        return btnCancel;
    }

    public void setBtnCancel(ButtonConfig btnCancel) {
        this.btnCancel = btnCancel;
    }

    public ButtonConfig getBtnConfirm() {
        return btnConfirm;
    }

    public void setBtnConfirm(ButtonConfig btnConfirm) {
        this.btnConfirm = btnConfirm;
    }

    public int getViewType() {
        return viewType;
    }

    public void setViewType(int viewType) {
        this.viewType = viewType;
    }
}
