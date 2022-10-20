package com.sana.dev.fm.adapter;


import static com.sana.dev.fm.utils.FmUtilize.safeList;
import static com.sana.dev.fm.utils.FmUtilize.translateWakeDaysAr;
import static com.sana.dev.fm.utils.Tools.getFormattedDateOnly;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Typeface;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;

import androidx.annotation.LayoutRes;
import androidx.core.content.ContextCompat;
import androidx.core.content.res.ResourcesCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemProgramsBinding;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.ViewAnimation;


import java.util.ArrayList;
import java.util.List;

public class AdapterListProgram extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private Context ctx;

    private List<RadioProgram> items;
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

    @Override
    public AdapterListProgram.MyViewHolder onCreateViewHolder(ViewGroup parent, int type) {
        ItemProgramsBinding inflate = ItemProgramsBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new MyViewHolder(inflate);
    }

    public static class MyViewHolder extends RecyclerView.ViewHolder {
        private final ItemProgramsBinding binding;

        public MyViewHolder(ItemProgramsBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

//    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int i) {
//        View view = LayoutInflater.from(ctx).inflate(R.layout.item_programs, parent, false);
//        binding = DataBindingUtil.bind(view);
//        MyViewHolder viewHolder = new ViewHolder(view);
//        return viewHolder;
////        return new MyViewHolder(LayoutInflater.from(view.getContext()).inflate(this.layout_id, viewGroup, false));
//    }


    @Override
    public int getItemCount() {
        return this.items.size();
    }

    @Override
    public void onBindViewHolder(RecyclerView.ViewHolder viewHolder, @SuppressLint("RecyclerView") final int position) {
        if (viewHolder instanceof MyViewHolder) {
            MyViewHolder holder = (MyViewHolder) viewHolder;
            holder.setIsRecyclable(false);

            RadioProgram program = (RadioProgram) this.items.get(position);
            initExpand(holder, program);

            final boolean isExpanded = position == mExpandedPosition;
//            holder.lyt_more.setVisibility(isExpanded?View.VISIBLE:View.GONE);
//            holder.itemView.setActivated(isExpanded);
            if (isExpanded) {
                Tools.toggleArrow(holder.binding.btToggle);

                ViewAnimation.expand(holder.binding.lytMore, new ViewAnimation.AnimListener() {
                    public void onFinish() {
//                        Tools.nestedScrollTo(holder.nested_scroll_view, holder.lyt_more);
                    }
                });
            } else {
                ViewAnimation.collapse(holder.binding.lytMore);
            }


            FmUtilize.hideEmptyElement(program.getPrName(), holder.binding.title);

            // Todo
//            originalViewHolder.tvCategory.setText(android.text.TextUtils.join(" , ", program.getPrCategoryList()));
//            originalViewHolder.tag.setText(String.format("@%s", program.getPrTag()));
//            holder.binding.tvTag.setText(program.getPrTag());
            FmUtilize.hideEmptyElement(null, holder.binding.tvTag);

            if (!TextUtils.isEmpty(program.getPrDesc())) {
                holder.binding.tvDec.setText(program.getPrDesc());
            } else {
                holder.binding.lytParentDesc.setVisibility(View.GONE);
            }


            if (program.getDateTimeModel() != null) {
                String dt = getFormattedDateOnly(program.getDateTimeModel().getDateStart()) + " - " + getFormattedDateOnly(program.getDateTimeModel().getDateEnd());
                holder.binding.tvDayPeriod.setText(dt);
            } else {
                holder.binding.lytParentDayPeriod.setVisibility(View.GONE);
            }


            Tools.displayImageOriginal(this.ctx, holder.binding.ivBanner, program.getPrProfile());


            holder.binding.btToggle.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    mExpandedPosition = isExpanded ? -1 : position;
//                    TransitionManager.beginDelayedTransition(holder);
//                    toggleSection(holder.binding.btToggle, holder);
                    Tools.toggleArrow(holder.binding.btToggle);
                    notifyDataSetChanged();
                }
            });

            holder.binding.lytParent.setOnClickListener(new OnClickListener() {
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



/*    private void changeStateOfItemsInLayout(int p) {
        for (int x = 0; x < items.size(); x++) {
            if (x == p) {
                items.get(x).setExpanded(true);
                //Since this is the tapped item, we will skip
                //the rest of loop for this item and set it expanded
                continue;
            }
            items.get(x).setExpanded(false);
        }
    }*/

    public void initExpand(MyViewHolder holder, RadioProgram program) {

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
//        holder.binding.btToggle.setOnClickListener(new View.OnClickListener() {
//            public void onClick(View view) {
//                toggleSection(holder.binding.btToggle, holder);
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
                Typeface typeface = ResourcesCompat.getFont(ctx, R.font.tj_regular);
                btn.setTypeface(typeface);
                holder.binding.flexDayShow.addView(btn, params);
            }
        } else {
            holder.binding.lytParentShowDays.setVisibility(View.GONE);
        }

        if (program.getPrCategoryList() != null) {
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
                Typeface typeface = ResourcesCompat.getFont(ctx, R.font.tj_regular);
                btn.setTypeface(typeface);
                holder.binding.flexCategory.addView(btn, params);
            }
        } else {
            holder.binding.lytParentCategory.setVisibility(View.GONE);
        }


    }

    private void toggleSection(View view, MyViewHolder viewHolder) {
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


    public void removeAt(int position) {
        items.remove(position);
        notifyItemRemoved(position);
//        notifyItemRangeChanged(position, items.size());
    }

}
