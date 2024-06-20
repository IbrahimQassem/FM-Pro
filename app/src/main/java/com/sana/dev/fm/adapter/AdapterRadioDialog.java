package com.sana.dev.fm.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.utils.Tools;

import java.util.List;

public class AdapterRadioDialog extends ArrayAdapter<RadioInfo> {

    private final Context context;
    private final List<RadioInfo> items;
    private OnClickListener onClickListener = null;

    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }

    public AdapterRadioDialog(Context context, List<RadioInfo> items) {
        super(context, R.layout.item_radio_select, items); // Replace R.layout.item_layout with your layout ID
        this.context = context;
        this.items = items;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        View view = inflater.inflate(R.layout.item_radio_select, parent, false);

        LinearLayout lyt_parent = (LinearLayout) view.findViewById(R.id.lyt_parent); // Replace R.id.item_image with your image view ID
        ImageView imageView = (ImageView) view.findViewById(R.id.civ_logo); // Replace R.id.item_image with your image view ID
        TextView textView = (TextView) view.findViewById(R.id.tv_title); // Replace R.id.item_text with your text view ID

        RadioInfo item = items.get(position);
//        imageView.setImageResource(item.getImageResourceId());
        textView.setText(item.getName());

        Tools.displayImageOriginal(context, imageView, item.getLogo());
//        Tools.displayUserProfile(context, imageView, item.getLogo(), R.drawable.ic_photo);

        lyt_parent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (onClickListener != null) {
                    onClickListener.onItemClick(v, item, position);
                }
            }
        });
        return view;
    }
}

