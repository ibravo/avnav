package de.wellenvogel.avnav.appapi;

import android.content.res.AssetManager;
import android.net.Uri;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import de.wellenvogel.avnav.util.AvnLog;

public class UserDirectoryRequestHandler extends DirectoryRequestHandler {
    private static final byte[] PREFIX="(function(){\n".getBytes(StandardCharsets.UTF_8);
    private static final byte[] SUFFIX="\n})();\n".getBytes(StandardCharsets.UTF_8);
    private static String templateFiles[]=new String[]{"user.css","user.js"};
    private static String emptyJsonFiles[]=new String[]{"keys.json","images.json"};
    //input stream for a js file wrapped by prefix and suffix
    static class JsStream extends InputStream {
        FileInputStream fs;
        int prfxPtr=0;
        int sfxPtr=0;
        int mode=0; //0-prefix,1-file,2-suffix
        byte[] prefix=null;
        public JsStream(FileInputStream fs,byte[] additionalPrefix) throws UnsupportedEncodingException {
            this.fs=fs;
            this.prefix=new byte[PREFIX.length+additionalPrefix.length];
            System.arraycopy(PREFIX,0,this.prefix,0,PREFIX.length);
            System.arraycopy(additionalPrefix,0,this.prefix,PREFIX.length,additionalPrefix.length);
        }
        @Override
        public int read() throws IOException {
            switch (mode) {
                case 0:
                    if (prfxPtr < this.prefix.length) {
                        int rt=this.prefix[prfxPtr];
                        prfxPtr++;
                        return rt;
                    }
                    mode=1;
                case 1:
                    int rt=fs.read();
                    if (rt >= 0) return rt;
                    mode=2;
                case 2:
                    if (sfxPtr < SUFFIX.length) {
                        int rts=SUFFIX[sfxPtr];
                        sfxPtr++;
                        return rts;
                    }
                    mode=3;
            }
            return -1;
        }

        @Override
        public void close() throws IOException {
            super.close();
            fs.close();
            mode=3;
        }
    };
    public UserDirectoryRequestHandler(RequestHandler handler, IDeleteByUrl deleter) throws IOException {
        super(handler, RequestHandler.TYPE_USER, RequestHandler.typeDirs.get(RequestHandler.TYPE_USER).value, "user/viewer", deleter);
        AssetManager assets=handler.activity.getAssets();
        for (String filename : templateFiles){
            File file=new File(workDir,filename);
            if (! file.exists()){
                String templateName="viewer/"+filename;
                try {
                    InputStream src = assets.open(templateName);
                    AvnLog.i("creating user file " + filename + " from template");
                    FileOutputStream out=new FileOutputStream(file);
                    byte buffer[]=new byte[10000];
                    int rd=0;
                    while ((rd=src.read(buffer)) >=0 ){
                        out.write(buffer,0,rd);
                    }
                    out.close();
                    src.close();
                }catch (Throwable t){
                    AvnLog.e("unable to copy template "+templateName,t);
                }
            }
        }
        for (String filename : emptyJsonFiles){
            File file=new File(workDir,filename);
            if (! file.exists()){
                try {
                    AvnLog.i("creating empty user file " + filename );
                    PrintWriter out= new PrintWriter(new FileOutputStream(file));
                    out.println("{ }");
                    out.close();
                }catch (Throwable t){
                    AvnLog.e("unable to create "+filename,t);
                }
            }
        }
    }
    @Override
    public ExtendedWebResourceResponse handleDirectRequest(Uri uri) throws FileNotFoundException, UnsupportedEncodingException {
        String path=uri.getPath();
        if (path == null) return null;
        if (path.startsWith("/")) path=path.substring(1);
        if (!path.startsWith(urlPrefix)) return null;
        path = path.substring((urlPrefix.length()+1));
        String[] parts = path.split("/");
        if (parts.length < 1) return null;
        if (parts.length > 1) return super.handleDirectRequest(uri);
        String name= URLDecoder.decode(parts[0],"UTF-8");
        if (!name.equals("user.js")) return super.handleDirectRequest(uri);
        File foundFile=new File(workDir,name);
        if (! foundFile.exists()) return super.handleDirectRequest(uri);
        String base="/"+urlPrefix;
        byte[] baseUrl=("var AVNAV_BASE_URL=\""+base+"\";\n").getBytes(StandardCharsets.UTF_8);
        long flen=foundFile.length()+SUFFIX.length+PREFIX.length+baseUrl.length;
        JsStream out=new JsStream(new FileInputStream(foundFile),baseUrl);
        return new ExtendedWebResourceResponse(
                    flen,
                    handler.mimeType(foundFile.getName()),
                    "", out);

    }
}
