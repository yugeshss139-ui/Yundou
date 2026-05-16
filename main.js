import './style.css'

// Initialize Lucide icons
lucide.createIcons();

const allSongs = [
    // Previous songs
    {
        title: "Adiye Sakkarakatti",
        artist: "Hiphop Tamizha",
        image: "https://i.ytimg.com/vi/8YJdRIf9sd0/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917846/Adiye_Sakkarakatti_Hiphop_Tamizha_Sudarshan_Ashok_1_jpy0es.mp3"
    },
    {
        title: "Adiyae Azhagae",
        artist: "Sean Roldan",
        image: "https://i.ytimg.com/vi/SDAMyv1hbCo/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917843/Adiyae_Azhagae_-_Sean_Roldan_Padmalatha_uh5b5a.mp3"
    },
    {
        title: "Adiye",
        artist: "Dhibu Ninan Thomas",
        image: "https://m.media-amazon.com/images/I/51QYbeYJgwL._UXNaN_FMjpg_QL85_.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917842/Adiye_-_Dhibu_Ninan_Thomas_Kapil_Kapilan_kibibq.mp3"
    },
    {
        title: "Adhi Dha Surprisu",
        artist: "G. V. Prakash Kumar",
        image: "https://i.ytimg.com/vi/X2G8YEYKI38/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917840/Adhi_Dha_Surprisu_-_G_V_Prakash_Kumar_Neeti_Mohan_Anurag_Kulkarni_xvdgzo.mp3"
    },
    {
        title: "Velicha Poove",
        artist: "Mohit Chauhan & Shreya Ghoshal",
        image: "https://i.ytimg.com/vi/Zr6TMhjBbWk/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917839/Velicha_Poove_-_Mohit_Chauhan_and_Shreya_Ghoshal_pexewc.mp3"
    },
    {
        title: "Oh Penne",
        artist: "Anirudh Ravichander",
        image: "https://i.scdn.co/image/ab67616d0000b27335e00bf518c28471731ee55c",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917836/Oh_Penne_-_Vishal_Dadlani_Anirudh_Ravichander_gobygr.mp3"
    },
    {
        title: "Thirudi",
        artist: "Anirudh Ravichander",
        image: "https://i.scdn.co/image/ab67616d0000b2730d7d103505d898dc57ae4c88",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917835/Thirudi_-_Anirudh_Ravichander_tt0yee.mp3"
    },
    {
        title: "Thodu Vaanam",
        artist: "Hariharan",
        image: "https://i.ytimg.com/vi/gSkiwm5AYE4/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBY2vnBMC-ffXYO_KgU9vxCY0ZDSw",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917835/Thodu_Vaanam_-_Hariharan_Shakthishree_Gopalan_knulkq.mp3"
    },
    {
        title: "Yendi Vittu Pona",
        artist: "Leon James",
        image: "https://i.scdn.co/image/ab67616d0000b273aea66ada588f64ef50ca1fca",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917834/Yendi_Vittu_Pona_-_Leon_James_Silambarasan_Tr_gm5hl2.mp3"
    },
    {
        title: "Aazhi Soozhndha",
        artist: "Srikanth Hariharan",
        image: "https://i.ytimg.com/vi/Ng1RFTYp4-c/sddefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917832/Aazhi_Soozhndha_-_Srikanth_Hariharan_jftp85.mp3"
    },
    {
        title: "Yennachu Yedhachu",
        artist: "G. V. Prakash Kumar",
        image: "https://i.ytimg.com/vi/wb6kwrptNlE/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCXFAiUiihJ4DMUrl_d9OOs4XCt9w",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917828/Yennachu_Yedhachu_-_G_V_Prakash_Kumar_Saindhavi_Kalyani_Pradeep_rl4xj7.mp3"
    },
    // New songs for "Fav of all time💕"
    {
        title: "Yaaraiyum Ivlo Azhaga",
        artist: "Simbu & Mervin Solomon",
        image: "https://c.saavncdn.com/876/Yaaraiyum-Ivlo-Azhaga-From-Sulthan--Tamil-2021-20210306043025-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917825/Yaaraiyum_Ivlo_Azhaga_Simbu_Mervin_Solomon_gvwav2.mp3"
    },
    {
        title: "Venmegam Pennaga",
        artist: "Hariharan",
        image: "https://i.pinimg.com/1200x/fc/8e/0b/fc8e0bfd2292442d9ecace71630f3461.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917823/Venmegam_Pennaga_-_Hariharan_geubas.mp3"
    },
    {
        title: "Yaar Indha Saalai Oram",
        artist: "G.V. Prakash Kumar",
        image: "https://i.scdn.co/image/ab67616d0000b273a1fc62a7f8ca2b5330ae23f8",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917820/Yaar_Indha_Saalai_Oram_-_GVPrakash_Kumar_Saindhavi_zkohn1.mp3"
    },
    {
        title: "The One",
        artist: "Sid Sriram & Santhosh Narayanan",
        image: "https://i.scdn.co/image/ab67616d0000b273e7b5cf02c7a3df4a85957484",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917813/The_One_Sid_Sriram_Santhosh_Narayanan_SVDP_f4rxit.mp3"
    },
    {
        title: "Unnale",
        artist: "Artist",
        image: "https://i.pinimg.com/1200x/7d/15/0d/7d150d649e09482d01747584d764b02a.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917812/Unnale_nzuqg6.mp3"
    },
    {
        title: "Usure",
        artist: "Sudharshan Ashok",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSo2AzQ6oN8Mf5JC5YlDs39Y1hhCSNEZBMo4jcsd-rmhoZcn1kIuylf&usqp=CAE&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917812/Usure_-_Sudharshan_Ashok_Jothi_Pushpa_rimknx.mp3"
    },
    {
        title: "Vaa Senthaazhini",
        artist: "Justin Prabhakaran",
        image: "https://i.scdn.co/image/ab67616d0000b273fc464d7d67efd808f534af4b",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917810/Vaa_Senthaazhini_-_Justin_Prabhakaran_mza6ly.mp3"
    },
    {
        title: "Thaniye",
        artist: "Anirudh Ravichander",
        image: "https://c.saavncdn.com/838/Thaniye-From-Vidaamuyarchi-Tamil-2025-20250206013659-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917810/Thaniye_-_Anirudh_Ravichander_yl9ife.mp3"
    },
    {
        title: "Un Vizhigalil",
        artist: "Artist",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcST71IXjMfGQj7NooWYQtnPV_JEk84QV8yzZw&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917795/Un_Vizhigalil_zwiify.mp3"
    },
    {
        title: "Thayaga Naan",
        artist: "Jen Martin",
        image: "https://i.ytimg.com/vi/EErYhzGH_Ag/sddefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917794/Thayaga_Naan_-_Jen_Martin_hmo6zc.mp3"
    },
    {
        title: "Thaarame Thaarame",
        artist: "Sid Sriram",
        image: "https://cdn-images.dzcdn.net/images/cover/9b73560173f215aa4dd08594cb1f8084/0x1900-000000-80-0-0.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917793/Thaarame_Thaarame_-_Sid_Sriram_qajlyc.mp3"
    },
    {
        title: "The Metro Proposal",
        artist: "Sai Abhyankkar",
        image: "https://c.saavncdn.com/300/Dude-Side-A-Original-Score-Unknown-2025-20251205171547-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917787/The_Metro_Proposal_-_Sai_Abhyankkar_taa675.mp3"
    },
    {
        title: "Pona Usuru Vanthurichu",
        artist: "Artist",
        image: "https://i.ytimg.com/vi/0mqIALKi-SE/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCjJfd4S66_dZYhFYlJlwAcjRupJA",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917786/Pona_Usuru_Vanthurichu_lqkfma.mp3"
    },
    {
        title: "Thaangaadha Baaram",
        artist: "Anirudh Ravichander",
        image: "https://c.saavncdn.com/238/Thiruchitrambalam-Tamil-2022-20220927091058-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917785/Thaangaadha_Baaram_-_Anirudh_Ravichander_dwr43p.mp3"
    },
    {
        title: "Sirikkadhey",
        artist: "Arjun Kanungo",
        image: "https://i1.sndcdn.com/artworks-000198881612-cc7588-t500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917783/Sirikkadhey_-_Arjun_Kanungo_Srinidhi_Venkatesh_jf9tlj.mp3"
    },
    {
        title: "Pattuma",
        artist: "Anirudh Ravichander",
        image: "https://i.ytimg.com/vi/BOhXss1zQLk/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917783/Pattuma_-_Anirudh_Ravichander_mmhqri.mp3"
    },
    {
        title: "Mayilaanjiye",
        artist: "Anand Aravindakshan",
        image: "https://i.ytimg.com/vi/02A_x-BUeP0/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917782/Mayilaanjiye_-_Anand_Aravindakshan_Shashaa_Tirupati_d4crzm.mp3"
    },
    {
        title: "Nee Kavithaigala",
        artist: "Pradeep Kumar",
        image: "https://i.ytimg.com/vi/pVkDZueTBpY/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCGatcDvHje4xp_NQJq8qYWp5eAxw",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917780/Nee_Kavithaigala-_Pradeep_Kumar_ikhvyv.mp3"
    },
    {
        title: "Paranthene Penne",
        artist: "G. V. Prakash Kumar",
        image: "https://c.saavncdn.com/471/Paranthene-Penne-From-Youth-Tamil-2026-20260219193543-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917779/Paranthene_Penne_-_G_V_Prakash_Kumar_y8ramk.mp3"
    },
    {
        title: "Polladha Boomi",
        artist: "Dhanush & G. V. Prakash",
        image: "https://i.ytimg.com/vi/ZBn_sEfoUDU/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917778/Polladha_Boomi_-_Dhanush_G_V_Prakash_Kumar_Ken_zgkemi.mp3"
    },
    {
        title: "Orasaadha",
        artist: "Vivek-Mervin",
        image: "https://c.saavncdn.com/331/Orasaadha-Madras-Gig--Tamil-2018-20180612071150-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917777/Orasaadha_-_Vivek-Mervin_hndrid.mp3"
    },
    {
        title: "Oxygen",
        artist: "Hiphop Tamizha",
        image: "https://c.saavncdn.com/635/Kavan-Full-Tamil-2016-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917774/Oxygen_-_Hiphop_Tamizha_dntssq.mp3"
    },
    {
        title: "Neelothi",
        artist: "Sooraj Santhosh & Chinmayi",
        image: "https://i.scdn.co/image/ab67616d0000b27355aee813293caf481e8f4a00",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917773/Neelothi_Sooraj_Santhosh_Chinmayi_Sripada_Justin_Prabhakaran_tfzol3.mp3"
    },
    {
        title: "Kannukulla Reprise",
        artist: "Sai Abhyankkar",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSqD70VB9prhdPeIcK-PizRUChGdLytPfN7i2kQ6JW77iQcBPQ_ktP&usqp=CAE&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917771/Kannukulla_Reprise_Sai_Abhyankkar_kv8ghr.mp3"
    },
    {
        title: "Ninaivirukka",
        artist: "Artist",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgxOfouCb6Lfly0GtD6LyaJmhKs4UvWn5ORw&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917770/Ninaivirukka_tmk66w.mp3"
    },
    {
        title: "Moochava Pechava",
        artist: "Sai Abhyankkar",
        image: "https://i.ytimg.com/vi/MpQ4fFWXLjY/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917770/Moochava_Pechava_-_Sai_Abhyankkar_aqnqs7.mp3"
    },
    {
        title: "Mudhal Nee Mudivum Nee",
        artist: "Darbuka Siva & Sid Sriram",
        image: "https://i.scdn.co/image/ab67616d0000b27391f6123cc3ef9020c4d63215",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917766/Mudhal_Nee_Mudivum_Nee_Title_Track_Darbuka_Siva_Sid_Sriram_ddpvw0.mp3"
    },
    {
        title: "Mayakkama Kalakkama",
        artist: "Dhanush & Anirudh",
        image: "https://c.saavncdn.com/238/Thiruchitrambalam-Tamil-2022-20220927091058-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917764/Mayakkama_Kalakkama_-_Dhanush_Anirudh_Ravichander_hprla3.mp3"
    },
    {
        title: "Enna Solla Pogirai",
        artist: "A. R. Rahman",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS53QaONdC_drWHP69dnrJfajlk-kEUes1GVA&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917763/Enna_Solla_Pogirai_-_A_R_Rahman_wcj2pj.mp3"
    },
    {
        title: "Life of Pazham",
        artist: "Anirudh Ravichander",
        image: "https://sund-images.sunnxt.com/146130/1600x1200_LifeofPazham_146130_26eeb833-81db-4e46-a674-908f912c8942.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917762/Life_of_Pazham_-_Anirudh_Ravichander_Vivek_ilyplm.mp3"
    },
    {
        title: "Kannadi Poove",
        artist: "Santhosh Narayanan",
        image: "https://c.saavncdn.com/666/Kannadi-Poove-From-Retro-Tamil-2025-20250212141009-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917761/Kannadi_Poove_Santhosh_Narayanan_w7oexz.mp3"
    },
    {
        title: "Madras To Madurai",
        artist: "Kailash Kher",
        image: "https://i.ytimg.com/vi/6oBvMxax93A/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917760/Madras_To_Madurai_-_Kailash_Kher_Vishnu_Priya_Maria_ioucqs.mp3"
    },
    {
        title: "Kadhal Kan Kattudhe",
        artist: "Anirudh",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfX4EikzJ2z0lQFPtaDRjfWg2SGmBvLjxG1A&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917755/Kadhal_Kan_Kattudhe_-_Anirudh_Shakthisri_Gopalan_azsy84.mp3"
    },
    {
        title: "Kannamma En Kannamma",
        artist: "Artist",
        image: "https://c.saavncdn.com/097/Kannamma-En-Kannamma-From-Kara-Original-Motion-Picture-Soundtrack-Tamil-2026-20260406203429-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917755/Kannamma_En_Kannamma_From_Kara_hcqyjh.mp3"
    },
    {
        title: "Jal Jal Jal Oosai",
        artist: "Aalaap Raju",
        image: "https://a10.gaanacdn.com/gn_img/albums/BZgWoQOK2d/ZgWoqyOK2d/size_m.webp",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917750/Jal_Jal_Jal_Oosai_-_Aalaap_Raju_Surmukhi_xpxkk3.mp3"
    },
    {
        title: "Ennai Polave",
        artist: "Sean Roldan",
        image: "https://i.scdn.co/image/ab67616d0000b273a3f2b8124c8196a11d764f4d",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917750/Ennai_Polave_-_Sean_Roldan_xpvupv.mp3"
    },
    {
        title: "Kadhaippoma",
        artist: "Sid Sriram",
        image: "https://i.scdn.co/image/ab67616d0000b273b90993f456d70b9859bd665e",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917747/Kadhaippoma_-_Sid_Sriram_vhwjbt.mp3"
    },
    {
        title: "Idhu Dhaan",
        artist: "Naresh Iyer",
        image: "https://i.ytimg.com/vi/7ydI06TnEJs/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBclclqgEJCt4DIhz-dr6aB6gWZUQ",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917744/Idhu_Dhaan_-_Naresh_Iyer_Shashaa_Tirupati_wq0lau.mp3"
    },
    {
        title: "I Will Never Let You Go",
        artist: "Shweta Pandit",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4tIBYcWWaNH8Ii5AvlSeDGSQe_mDwG5LvfHjs75qXNzmC3KUwnjjuSw0&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917744/I_Will_Never_Let_You_Go_-_Shweta_Pandit_czo3iy.mp3"
    },
    {
        title: "Enakenna Yaarum Illaye",
        artist: "Anirudh Ravichander",
        image: "https://c.saavncdn.com/348/Enakenna-Yaarum-Illaye-From-Aakko--Tamil-2015-20200805134750-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917737/Enakenna_Yaarum_Illaye_-_Anirudh_Ravichander_zvx49c.mp3"
    },
    {
        title: "High On Love",
        artist: "Sid Sriram",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzFPlezTvEz0pzYltJLsFWYmmxUkmDW42cTw&s",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917736/High_On_Love_-_Sid_Sriram_ywrn1q.mp3"
    },
    {
        title: "Eppadi Vandhaayo",
        artist: "Chinmayi & Anand",
        image: "https://c.saavncdn.com/670/Eppadi-Vandhaayo-From-Aaromaley-Tamil-2025-20251125133329-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917734/Eppadi_Vandhaayo_-_Chinmayi_Anand_Aravindakshan_1_lql2ow.mp3"
    },
    {
        title: "First Sight",
        artist: "Anirudh",
        image: "https://c.saavncdn.com/283/Remo-Special-Original-Background-Score-Additional-Song-English-2016-500x500.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917734/First_Sight_-_Anirudh_Ravichander_ckprje.mp3"
    },
    {
        title: "Edhukku Dhan Indha Kaadhal",
        artist: "Sean Roldan",
        image: "https://i.scdn.co/image/ab67616d0000b2737cf59babb1dd0681b34fdc2d",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917730/Edhukku_Dhan_Indha_Kaadhal_Sean_Roldan_imbht1.mp3"
    },
    {
        title: "Edakku Modakku",
        artist: "Sivakarthikeyan & Anirudh",
        image: "https://i.ytimg.com/vi/Ht5bwzeYszM/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917729/Edakku_Modakku_-_Anirudh_Ravichander_Sivakarthikeyan_p7p1gu.mp3"
    },
    {
        title: "Ammadi Un Azhagu",
        artist: "Instrumental",
        image: "https://i.ytimg.com/vi/N6jFnvtVVhs/maxresdefault.jpg",
        url: "https://res.cloudinary.com/deg9dfhfs/video/upload/v1778917729/Ammadi_Un_Azhagu_Karaoke_-_Instrumental_eflh8x.mp3"
    }
];

let currentSongIndex = 0;
const audio = new Audio(allSongs[currentSongIndex].url);
let isPlaying = false;

function createCard(item, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" class="card-image">
        <div class="play-btn-overlay">
            <i data-lucide="play"></i>
        </div>
        <div class="card-title">${item.title}</div>
        <div class="card-desc">${item.artist}</div>
    `;

    card.addEventListener('click', () => {
        playSong(index);
    });

    return card;
}

function playSong(index) {
    currentSongIndex = index;
    audio.src = allSongs[currentSongIndex].url;
    audio.play();
    isPlaying = true;
    updateUI();
}

function togglePlay() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
    updateUI();
}

function updateUI() {
    const song = allSongs[currentSongIndex];
    document.getElementById('current-track-img').src = song.image;
    document.getElementById('current-track-title').innerText = song.title;
    document.getElementById('current-track-artist').innerText = song.artist;

    const playIcon = document.getElementById('main-play-icon');
    playIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
    lucide.createIcons();
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

const playlistGrid = document.getElementById('playlist-grid');
const madeForYouGrid = document.getElementById('made-for-you-grid');

// Render all songs in the "Good evening" grid
allSongs.forEach((item, index) => {
    playlistGrid.appendChild(createCard(item, index));
});

// Render random selection in "Made for you"
[...allSongs].sort(() => 0.5 - Math.random()).slice(0, 12).forEach((item) => {
    const index = allSongs.indexOf(item);
    madeForYouGrid.appendChild(createCard(item, index));
});

// Player Controls
const playPauseBtn = document.querySelector('.play-pause');
const nextBtn = document.querySelector('[data-lucide="skip-forward"]').parentElement;
const prevBtn = document.querySelector('[data-lucide="skip-back"]').parentElement;
const progressBar = document.getElementById('progress-slider');
const progressFill = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');

playPauseBtn.addEventListener('click', togglePlay);

nextBtn.addEventListener('click', () => {
    currentSongIndex = (currentSongIndex + 1) % allSongs.length;
    playSong(currentSongIndex);
});

prevBtn.addEventListener('click', () => {
    currentSongIndex = (currentSongIndex - 1 + allSongs.length) % allSongs.length;
    playSong(currentSongIndex);
});

audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = `${percent}%`;
    currentTimeEl.innerText = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    durationEl.innerText = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
    currentSongIndex = (currentSongIndex + 1) % allSongs.length;
    playSong(currentSongIndex);
});

progressBar.addEventListener('click', (e) => {
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    audio.currentTime = (clickX / width) * duration;
});

// Top bar scroll effect
const mainContent = document.getElementById('main-content');
const topBar = document.querySelector('.top-bar');

mainContent.addEventListener('scroll', () => {
    const opacity = Math.min(mainContent.scrollTop / 200, 1);
    topBar.style.backgroundColor = `rgba(18, 18, 18, ${opacity * 0.9})`;
});

// Sidebar Responsive Logic
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const app = document.getElementById('app');

function checkMobile() {
    if (window.innerWidth < 768) {
        app.classList.add('mobile-view');
    } else {
        app.classList.remove('mobile-view');
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('visible');
    }
}

// Initial check
checkMobile();
window.addEventListener('resize', checkMobile);

function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('visible');
}

menuToggle?.addEventListener('click', toggleSidebar);
sidebarOverlay?.addEventListener('click', toggleSidebar);

// Close sidebar when clicking a nav item on mobile
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    });
});

// Update current track on click
function updateCurrentTrackUI(song) {
    document.getElementById('current-track-img').src = song.image;
    document.getElementById('current-track-title').innerText = song.title;
    document.getElementById('current-track-artist').innerText = song.artist;
}

lucide.createIcons();
