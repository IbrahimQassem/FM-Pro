package com.sana.dev.fm.adapter;


import static com.sana.dev.fm.utils.FmUtilize.safeList;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysAr;
import static com.sana.dev.fm.utils.Tools.getFormattedDateOnly;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Typeface;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.LayoutRes;
import androidx.core.content.ContextCompat;
import androidx.core.content.res.ResourcesCompat;
import androidx.core.widget.NestedScrollView;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.google.android.flexbox.FlexboxLayout;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.ViewAnimation;


import java.util.ArrayList;
import java.util.List;

public class AdapterListProgram extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private Context ctx;
    private List<RadioProgram> items = new ArrayList();
    @LayoutRes
    private int layout_id;
    private OnItemClickListener mOnItemClickListener;
    private OnLongItemClickListener mOnLongItemClickListener;

    private int mExpandedPosition = -2;

    public AdapterListProgram(Context context, List<RadioProgram> list, @LayoutRes int i) {
        this.items = list;
        this.ctx = context;
        this.layout_id = i;
    }

    public void setOnItemClickListener(OnItemClickListener onItemClickListener) {
        this.mOnItemClickListener = onItemClickListener;
    }

    public void setOnLongItemClickListener(final OnLongItemClickListener mItemLongClickListener) {
        this.mOnLongItemClickListener = mItemLongClickListener;
    }


    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup viewGroup, int i) {
        return new OriginalViewHolder(LayoutInflater.from(viewGroup.getContext()).inflate(this.layout_id, viewGroup, false));
    }

    public void onBindViewHolder(RecyclerView.ViewHolder viewHolder, @SuppressLint("RecyclerView") final int position) {
        if (viewHolder instanceof OriginalViewHolder) {
            OriginalViewHolder holder = (OriginalViewHolder) viewHolder;
            holder.setIsRecyclable(false);

            RadioProgram program = (RadioProgram) this.items.get(position);
            initExpand(holder, program);

            final boolean isExpanded = position == mExpandedPosition;
//            holder.lyt_more.setVisibility(isExpanded?View.VISIBLE:View.GONE);
//            holder.itemView.setActivated(isExpanded);
            if (isExpanded) {
                Tools.toggleArrow(holder.bt_toggle);

                ViewAnimation.expand(holder.lyt_more, new ViewAnimation.AnimListener() {
                    public void onFinish() {
//                        Tools.nestedScrollTo(holder.nested_scroll_view, holder.lyt_more);
                    }
                });
            } else {
                ViewAnimation.collapse(holder.lyt_more);
            }
            holder.bt_toggle.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    mExpandedPosition = isExpanded ? -1 : position;
//                    TransitionManager.beginDelayedTransition(holder);
//                    toggleSection(holder.bt_toggle, holder);
                    Tools.toggleArrow(holder.bt_toggle);
                    notifyDataSetChanged();
                }
            });

            holder.title.setText(program.getPrName());
            holder.description.setText(program.getPrDesc());
//            holder.tag.setText(program.getPrTag());

            if (program.getDateTimeModel() != null) {
                String dt = getFormattedDateOnly(program.getDateTimeModel().getDateStart()) + " - " + getFormattedDateOnly(program.getDateTimeModel().getDateEnd());
                holder.date.setText(dt);
            }
            // Todo
//            originalViewHolder.tvCategory.setText(android.text.TextUtils.join(" , ", program.getPrCategoryList()));
//            originalViewHolder.tag.setText(String.format("@%s", program.getPrTag()));
//            Tools.displayImageOriginal(this.ctx, holder.image_view, program.getPrProfile());
            Tools.displayImageOriginal(this.ctx, holder.image, program.getPrProfile());
//            Tools.displayUserProfile(this.ctx, holder.image, program.getPrProfile());
            Glide.with(ctx)
                    .load(program.getPrProfile())
                    .fitCenter()
                    .placeholder(R.drawable.logo_app)
                    .error(R.drawable.logo_app)
                    .into(holder.image_view);


            holder.lyt_parent.setOnClickListener(new OnClickListener() {
                public void onClick(View view) {
                    if (AdapterListProgram.this.mOnItemClickListener != null) {
                        AdapterListProgram.this.mOnItemClickListener.onItemClick(view, (RadioProgram) AdapterListProgram.this.items.get(position), position);
                    }
                }
            });


            holder.itemView.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    if (mOnLongItemClickListener != null) {
                        mOnLongItemClickListener.onLongItemClick(v, (RadioProgram) items.get(position), position);
                    }
                    return false;
                }
            });
        }
    }

    public int getItemCount() {
        return this.items.size();
    }


//    private void changeStateOfItemsInLayout(int p) {
//        for (int x = 0; x < items.size(); x++) {
//            if (x == p) {
//                items.get(x).setExpanded(true);
//                //Since this is the tapped item, we will skip
//                //the rest of loop for this item and set it expanded
//                continue;
//            }
//            items.get(x).setExpanded(false);
//        }
//    }

    public void initExpand(OriginalViewHolder holder, RadioProgram program) {

//        if (program.isExpanded()) {
////            holder.contentLayout.setVisibility(View.VISIBLE);
//            ViewAnimation.expand(holder.lyt_more, new ViewAnimation.AnimListener() {
//                public void onFinish() {
//                }
//            });
//        } else {
//            ViewAnimation.collapse(holder.lyt_more);
//
//        }


//        holder.lyt_more.setVisibility(View.GONE);
//        holder.bt_toggle.setOnClickListener(new View.OnClickListener() {
//            public void onClick(View view) {
//                toggleSection(holder.bt_toggle, holder);
////                if (holder.lyt_more.isShown()) {
////                    items.get(holder.getLayoutPosition()).isExpanded = false;
////                } else {
////                    items.get(holder.getLayoutPosition()).isExpanded = true;
////                    changeStateOfItemsInLayout(holder.getLayoutPosition());
////                }
//                notifyDataSetChanged();
//            }
//        });


        if (program.getDateTimeModel() != null) {
            DateTimeModel dateTime = program.getDateTimeModel();
            ArrayList<WakeTranslate> arDayList = translateWakeDaysAr(dateTime.getDisplayDays());
            for (int i2 = 0; i2 < arDayList.size(); i2++) {
                int pixels = Math.round(Tools.dip2px(ctx, 40));

                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        pixels);

                Button btn = new Button(ctx);
                btn.setId(i2);
                btn.setText(arDayList.get(i2).getDayName());
                final int sdk = android.os.Build.VERSION.SDK_INT;
                if (sdk < android.os.Build.VERSION_CODES.JELLY_BEAN) {
                    btn.setBackgroundDrawable(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
                } else {
                    btn.setBackground(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
                }
                btn.setTextColor(ctx.getResources().getColor(R.color.grey_60));
                Typeface typeface = ResourcesCompat.getFont(ctx, R.font.tajwal_regular);
                btn.setTypeface(typeface);
                holder.flex_day_show.addView(btn, params);
            }
        }

        int index = 0;
        for (Object o : safeList(program.getPrCategoryList())) {
            // do whatever
            int pixels = Math.round(Tools.dip2px(ctx, 40));

            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    pixels);

            Button btn = new Button(ctx);
            btn.setId(index);
            index++;
            btn.setText(o.toString());
            final int sdk = android.os.Build.VERSION.SDK_INT;
            if (sdk < android.os.Build.VERSION_CODES.JELLY_BEAN) {
                btn.setBackgroundDrawable(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
            } else {
                btn.setBackground(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
            }
            btn.setTextColor(ctx.getResources().getColor(R.color.grey_60));
            Typeface typeface = ResourcesCompat.getFont(ctx, R.font.tajwal_regular);
            btn.setTypeface(typeface);
            holder.flex_category.addView(btn, params);
        }


    }

    private void toggleSection(View view, OriginalViewHolder viewHolder) {
//        if (Tools.toggleArrow(view)) {
//            ViewAnimation.expand(viewHolder.lyt_more, new ViewAnimation.AnimListener() {
//                public void onFinish() {
//                }
//            });
//        } else {
//            ViewAnimation.collapse(viewHolder.lyt_more);
//        }

//      for(int i=0;i<items.size();i++){
//          if (Tools.toggleArrow(view)) {
//              ViewAnimation.expand(viewHolder.lyt_more, new ViewAnimation.AnimListener() {
//                  public void onFinish() {
//                  }
//              });
//          } else {
//              ViewAnimation.collapse(viewHolder.lyt_more);
//          }
//      }

    }


    public interface OnItemClickListener {
        void onItemClick(View view, RadioProgram news, int i);
    }

    public interface OnLongItemClickListener {
        void onLongItemClick(View view, RadioProgram obj, int position);
    }

    public class OriginalViewHolder extends RecyclerView.ViewHolder {
        public ImageView image_view;
        public CircularImageView image;
        public View lyt_parent, lyt_more;
        public  NestedScrollView nested_scroll_view;

        public TextView title, tag, date, description;
        public FlexboxLayout flex_day_show, flex_category;
        public ImageView imv_comment, bt_toggle;


        public OriginalViewHolder(View view) {
            super(view);
            this.image_view = (ImageView) view.findViewById(R.id.image_view);
            this.image = (CircularImageView) view.findViewById(R.id.image);
            this.title = (TextView) view.findViewById(R.id.title);
            this.description = (TextView) view.findViewById(R.id.description);
            this.tag = (TextView) view.findViewById(R.id.tag);
            this.date = (TextView) view.findViewById(R.id.date);
            this.lyt_parent = view.findViewById(R.id.lyt_parent);
            lyt_more = view.findViewById(R.id.lyt_more);
            nested_scroll_view = view.findViewById(R.id.nested_scroll_view);
            bt_toggle = view.findViewById(R.id.bt_toggle);
            flex_day_show = (FlexboxLayout) view.findViewById(R.id.flex_day_show);
            flex_category = (FlexboxLayout) view.findViewById(R.id.flex_category);

        }
    }

    public void removeAt(int position) {
        items.remove(position);
        notifyItemRemoved(position);
//        notifyItemRangeChanged(position, items.size());
    }

}
