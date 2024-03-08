#target photoshop

//<javascriptresource>
//<name>Generate Comps</name>
//<about>レイヤセットからレイヤカンプを生成する。作成者：minon</about>
//</javascriptresource>

// PSDファイル名から最後の "_" で区切られた文字列を取得する関数
function getParentName(fileName) {
    // ファイル名を "_" で分割し、配列に格納する
    var fileNameParts = fileName.split("_");
    // 配列の最後の要素を取得する
    var lastPart = fileNameParts[fileNameParts.length - 1]
    lastPart = lastPart.replace(".psd","");
    return lastPart;
}

// 特定の文字列を含むフォルダを探し、そのフォルダを返す
function findFolderByName(folderNameContains, parentFolder) {
    for (var i = 0; i < parentFolder.layerSets.length; i++) {
        var currentFolder = parentFolder.layerSets[i];
        if (currentFolder.name.indexOf(folderNameContains) !== -1) {
            return currentFolder;
        }
    }
    return null;
}

//指定された親レイヤフォルダ内のレイヤフォルダを配列で取得する
function getSubFolders(parentFolder) {
    var folders = []
    for (var i =0; i<parentFolder.layerSets.length; i++){
        var currentFolder = parentFolder.layerSets[i];
        folders.push(currentFolder);       
    }
    return folders;
    }

// 特定の名前を持つレイヤを取得する
function findLayerByName(layerNameContains, parentFolder) {
    var layers = parentFolder.layers;
    for (var i = 0; i < layers.length; i++) {
        var currentLayer = layers[i];
        if (currentLayer.name.indexOf(layerNameContains) !== -1) {
            return currentLayer;
        }
    }
    return null;
}

// 指定されたレイヤーとレイヤフォルダを可視または非可視にする
function toggleVisibility(layers, visible) {
    for (var i = 0; i < layers.length; i++) {
        if (layers[i] instanceof LayerSet) {
            // レイヤーフォルダの場合は再帰的に可視状態を切り替える
            toggleVisibility(layers[i].layers, visible);
        } else {
            layers[i].visible = visible;
        }
    }
}

// 指定された親フォルダ以下のレイヤーとレイヤフォルダのみ可視にする
function toggleVisibilityByFolderName(parentFolder, folderNameContains) {
    for (var i = 0; i < parentFolder.layerSets.length; i++) {
        var currentFolder = parentFolder.layerSets[i];
        // 指定した名前を含むフォルダの場合
        if (currentFolder.name.indexOf(folderNameContains) !== -1) {
            // レイヤフォルダじたいを可視状態にする
            currentFolder.visible = true;

            // レイヤーフォルダ内のレイヤーとレイヤーフォルダを可視または非可視にする
            toggleVisibility(currentFolder.layers, true);
        } 
        else{
            // レイヤフォルダじたいを非可視状態にする
            currentFolder.visible = false;

            // レイヤーフォルダ内のレイヤーとレイヤーフォルダを可視または非可視にする
            toggleVisibility(currentFolder.layers, false);
        }
    }
}

// 指定されたカンプに現在のレイヤの表示状態を登録する
function registerLayerVisibilityAsComp(compName) {
    // カレントドキュメントを取得
    var doc = app.activeDocument;
    
    // カンプが存在するか確認する
    try{
        var comp = doc.layerComps.getByName(compName);
    } catch(e) {
        // カンプが存在しない場合は作成する
        comp = doc.layerComps.add(compName);
    }
    
    // カンプに現在のレイヤの表示状態を登録する
    var layerState = [];
    var layers = doc.layers;
    for (var i = 0; i < layers.length; i++) {
        layerState.push({
            layer: layers[i],
            visible: layers[i].visible
        });
    }
    comp.layerVisibility = layerState;
    
    //alert("レイヤの表示状態をカンプ '" + compName + "' に登録しました。");
}

// プロセスバーを表示する
function showProgressBar(message) {
    var win = new Window("palette", message);
    win.progressBar = win.add("progressbar", undefined, 0, 100);
    win.show();
    return win;
}

// プロセスバーを更新する
function updateProgressBar(progressBar, value) {
    progressBar.progressBar.value = value;
    progressBar.update();
}


// ------------ メインの処理を実行 ------------ //

function main() {
    // アクティブファイルを取得
    var currentDocument = app.activeDocument;

    // 親フォルダを取得
    var parentFolderName = getParentName(currentDocument.name); 

    try{
        var parentFolder = findFolderByName(parentFolderName, currentDocument);
    } catch(e){
        alert("親フォルダ '" + parentFolderName + "' が見つかりませんでした。");
        return;
    }

    // ベースレイヤを強制的に表示
    try{
        var baseLayer = parentFolder.layers.getByName("base_image");
        baseLayer.visible = true;
    } catch(e) {
        alert("ベースイメージレイヤ '" + parentFolderName + "' が見つかりませんでした。");
        return;        
    }    

    // 色レイヤフォルダのオブジェクトの配列を取得
    var subFolders = getSubFolders(parentFolder);

    // プロセスバーを表示
    var progressBar = showProgressBar("処理中...");

    // 色レイヤごとにレイヤセットを表示、レイヤカンプに登録する
    for(var i = 0; i < subFolders.length; i++){
        var currentFolder = subFolders[i];
        var currentFolderName = currentFolder.name;
        var currentCompName = currentFolderName.replace("color_","")

        // 指定色レイヤフォルダのみを表示させる
        toggleVisibilityByFolderName(parentFolder, currentFolderName);

        // 現在の状態でレイヤカンプを登録する
        registerLayerVisibilityAsComp(currentCompName);

        // プロセスバーを更新
        var progressValue = (i + 1) / subFolders.length * 100;
        updateProgressBar(progressBar, progressValue);
    }

    // プロセスバーを閉じる
    progressBar.close();

    alert("処理が完了しました。");
}

// ------------ 実行 ------------ //
try {
    main();
} catch (e) {
    alert("エラーが発生しました: " + e);
}
