///**
// * Copyright 2016 Mattias Karlsson
// *
// * Licensed under the Apache License, Version 2.0 (the "License");
// * you may not use this file except in compliance with the License.
// * You may obtain a copy of the License at
// *
// *     http://www.apache.org/licenses/LICENSE-2.0
// *
// * Unless required by applicable law or agreed to in writing, software
// * distributed under the License is distributed on an "AS IS" BASIS,
// * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// * See the License for the specific language governing permissions and
// * limitations under the License.
// */
//
//package com.sana.dev.fm.utils.radio_player.metadata;
//
//import com.google.android.exoplayer2.upstream.DataSource;
//import com.google.android.exoplayer2.upstream.HttpDataSource;
//import com.google.android.exoplayer2.upstream.HttpDataSource.Factory;
//import com.google.android.exoplayer2.upstream.TransferListener;
//
//import okhttp3.CacheControl;
//import okhttp3.Call;
//
///**
// * A {@link Factory} that produces {@link ShoutcastDataSource}.
// */
//public final class ShoutcastDataSourceFactory extends HttpDataSource.BaseFactory {
//
//    private final Call.Factory callFactory;
//    private final String userAgent;
//    private final TransferListener<? super DataSource> transferListener;
//    private final ShoutcastMetadataListener shoutcastMetadataListener;
//    private final CacheControl cacheControl;
//
//    public ShoutcastDataSourceFactory(Call.Factory callFactory, String userAgent,
//                                      TransferListener<? super DataSource> transferListener,
//                                      ShoutcastMetadataListener shoutcastMetadataListener) {
//        this(callFactory, userAgent, transferListener, shoutcastMetadataListener, null);
//    }
//
//    private ShoutcastDataSourceFactory(Call.Factory callFactory, String userAgent,
//                                       TransferListener<? super DataSource> transferListener,
//                                       ShoutcastMetadataListener shoutcastMetadataListener, CacheControl cacheControl) {
//        this.callFactory = callFactory;
//        this.userAgent = userAgent;
//        this.transferListener = transferListener;
//        this.shoutcastMetadataListener = shoutcastMetadataListener;
//        this.cacheControl = cacheControl;
//    }
//
//    @Override
//    protected HttpDataSource createDataSourceInternal(HttpDataSource.RequestProperties requestProperties) {
//        return new ShoutcastDataSource(callFactory, userAgent, null, transferListener, shoutcastMetadataListener, cacheControl);
//    }
//
//}
